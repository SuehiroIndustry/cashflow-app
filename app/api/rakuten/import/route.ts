// app/api/rakuten/import/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

type BodyRow = {
  date: string; // "YYYY-MM-DD"
  section: "income" | "expense";
  amount: number;
  summary?: string | null;
};

type Body = {
  cashAccountId: number;
  sourceType?: string;
  rows: BodyRow[];
};

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  try {
    // ✅ JSONで受け取る
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const body = (await req.json()) as Partial<Body>;
    const cashAccountId = Number(body.cashAccountId);

    if (!Number.isFinite(cashAccountId)) {
      return NextResponse.json(
        { error: "cashAccountId is invalid" },
        { status: 400 }
      );
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ error: "rows is required" }, { status: 400 });
    }

    // ✅ cookies（Nextの型差異に備えて await + 型ガード）
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase public env is missing" },
        { status: 500 }
      );
    }

    // ✅ ログイン中ユーザーを cookies から取得（クライアントから userId を送らせない）
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          // Nextの型が環境によって Promise 扱いに見えることがあるため、ここだけ確実に握りつぶす
          return (cookieStore as any).getAll();
        },
        setAll() {
          // Route Handler では set 不要（参照だけ）
        },
      },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    // ✅ Service Role でDB書き込み（RLS回避）
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "supabaseKey is required." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // raw rows を作る（既存テーブルに合わせる）
    const nowIso = new Date().toISOString();

    const rawRows = rows
      .map((r) => {
        const date = String(r.date ?? "").trim();
        const section = r.section;
        const amount = Number(r.amount);
        const description = String(r.summary ?? "").trim();

        if (!isYmd(date)) return null;
        if (section !== "income" && section !== "expense") return null;
        if (!Number.isFinite(amount) || amount <= 0) return null;

        const direction = section === "income" ? "in" : "out";

        // ✅ 重複排除のキー
        const rowHash = sha256Hex(`${userId}|${date}|${direction}|${amount}|${description}`);

        return {
          user_id: userId,
          imported_at: nowIso,
          txn_date: date,
          description,
          amount,
          direction,
          balance: null,
          row_hash: rowHash,
          created_at: nowIso,
        };
      })
      .filter(Boolean) as any[];

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows (date/amount/section invalid)" },
        { status: 400 }
      );
    }

    // ✅ rawにUPSERT（重複は user_id,row_hash で弾く）
    const { error: rawErr } = await supabase
      .from("rakuten_bank_raw_transactions")
      .upsert(rawRows, { onConflict: "user_id,row_hash" });

    if (rawErr) {
      return NextResponse.json({ error: rawErr.message }, { status: 500 });
    }

    // ✅ cash_flows へ反映（既存RPC）
    const { data: inserted, error: rpcErr } = await supabase.rpc(
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
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}