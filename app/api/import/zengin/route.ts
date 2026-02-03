// app/api/import/zengin/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type IncomingRow = {
  date: string; // "YYYY-MM-DD"
  section: "income" | "expense";
  amount: number;
  summary?: string | null;
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function isIsoDate(s: string) {
  // 超ゆるいが十分：YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  try {
    // ✅ ログイン必須（userIdをクライアントから渡させない）
    const sb = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userRes.user.id;

    // ✅ JSON受け
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const cashAccountId = Number(body.cashAccountId);
    const rows = body.rows as IncomingRow[];

    if (!Number.isFinite(cashAccountId) || cashAccountId <= 0) {
      return NextResponse.json({ error: "cashAccountId is invalid" }, { status: 400 });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows is required" }, { status: 400 });
    }

    // ✅ Service Role で raw + RPC
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const nowIso = new Date().toISOString();

    // rawに入れる形へ整形
    const rawRows = [];
    for (const r of rows) {
      if (!r) continue;
      if (!isIsoDate(r.date)) continue;

      const amount = Number(r.amount);
      if (!Number.isFinite(amount)) continue;

      const section = r.section;
      const direction = section === "income" ? "in" : "out";
      const description = String(r.summary ?? "").trim();

      const rowHash = sha256Hex(`${userId}|${r.date}|${direction}|${amount}|${description}`);

      rawRows.push({
        user_id: userId,
        imported_at: nowIso,
        txn_date: r.date,
        description,
        amount,
        direction,
        balance: null,
        row_hash: rowHash,
        created_at: nowIso,
      });
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No valid rows" }, { status: 400 });
    }

    // ✅ raw に UPSERT（重複は user_id,row_hash で弾く）
    const { error: rawErr } = await admin
      .from("rakuten_bank_raw_transactions")
      .upsert(rawRows, { onConflict: "user_id,row_hash" });

    if (rawErr) {
      return NextResponse.json({ error: rawErr.message }, { status: 500 });
    }

    // ✅ raw → cash_flows 反映（あなたのRPC）
    const { data: inserted, error: rpcErr } = await admin.rpc(
      "import_rakuten_raw_to_cash_flows",
      { p_cash_account_id: cashAccountId }
    );

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      raw_rows_received: rawRows.length,
      cash_flows_inserted: inserted ?? 0,
      cash_account_id: cashAccountId,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}