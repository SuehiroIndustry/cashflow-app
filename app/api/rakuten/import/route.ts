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
    /* ============================
       🔍 一時デバッグ：環境変数確認
       ============================ */
    if (req.headers.get("x-debug-env") === "1") {
      return NextResponse.json({
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      });
    }

    /* ============================
       JSONチェック
       ============================ */
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
      return NextResponse.json({ error: "cashAccountId is invalid" }, { status: 400 });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ error: "rows is required" }, { status: 400 });
    }

    /* ============================
       認証ユーザー取得（cookie）
       ============================ */
    const cookieStore = await cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* route handler では不要 */
        },
      },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = userData.user.id;

    /* ============================
       Service Role クライアント
       ============================ */
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is missing on server" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    /* ============================
       raw rows 作成
       ============================ */
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

        const rowHash = sha256Hex(
          `${userId}|${date}|${direction}|${amount}|${description}`
        );

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
        { error: "No valid rows (invalid date/amount/section)" },
        { status: 400 }
      );
    }

    /* ============================
       raw upsert
       ============================ */
    const { error: rawErr } = await supabase
      .from("rakuten_bank_raw_transactions")
      .upsert(rawRows, { onConflict: "user_id,row_hash" });

    if (rawErr) {
      return NextResponse.json({ error: rawErr.message }, { status: 500 });
    }

    /* ============================
       cash_flows 反映（RPC）
       ============================ */
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
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}