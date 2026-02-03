// app/api/rakuten/import/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type BodyRow = {
  date: string; // "YYYY-MM-DD" or "YYYY/MM/DD" etc
  section: "income" | "expense" | "収入" | "支出" | string;
  amount: number | string;
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

function maskEnv(v: string | undefined | null) {
  if (v === null) return null;
  if (v === undefined) return undefined;
  return v.length ? "SET" : "EMPTY";
}

function normalizeDate(input: unknown): string | null {
  const s = String(input ?? "").trim();
  if (!s) return null;

  // allow YYYY/MM/DD -> YYYY-MM-DD
  const s2 = s.replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s2)) return s2;

  // allow YYYY-M-D -> zero pad
  const m = s2.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = m[1];
    const mm = String(m[2]).padStart(2, "0");
    const dd = String(m[3]).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  return null;
}

function normalizeSection(input: unknown): "income" | "expense" | null {
  const s = String(input ?? "").trim().toLowerCase();

  if (s === "income" || s === "収入" || s === "入金" || s === "in") return "income";
  if (s === "expense" || s === "支出" || s === "出金" || s === "out") return "expense";

  // よくあるCSVの表記ゆれ吸収（必要なら増やす）
  if (s.includes("収")) return "income";
  if (s.includes("支")) return "expense";

  return null;
}

function normalizeAmount(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  const s = String(input ?? "")
    .trim()
    .replace(/[¥,\s]/g, ""); // ¥ 1,234 とかを想定
  if (!s) return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

export async function POST(req: Request) {
  try {
    // ✅ Debug: env が入ってるかだけ返す（実値は返さない）
    if (req.headers.get("x-debug-env") === "1") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      return NextResponse.json({
        ok: true,
        env: {
          SUPABASE_URL: maskEnv(supabaseUrl),
          SUPABASE_ANON_KEY: maskEnv(supabaseAnonKey),
          SUPABASE_SERVICE_ROLE_KEY: maskEnv(serviceKey),
        },
        runtime: {
          nodeEnv: process.env.NODE_ENV ?? null,
          vercelEnv: process.env.VERCEL_ENV ?? null,
        },
      });
    }

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
      return NextResponse.json({ error: "cashAccountId is invalid" }, { status: 400 });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ error: "rows is required" }, { status: 400 });
    }

    // ✅ ここで public env 必須チェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase public env is missing" }, { status: 500 });
    }

    // ✅ ログイン中ユーザーを cookies から取得（自前cookies処理しない）
    const supabaseAuth = await createSupabaseServerClient();
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

    const nowIso = new Date().toISOString();

    // --- 受け取りrowsの正規化 & 弾いた理由カウント（デバッグに強い） ---
    let rejectDate = 0;
    let rejectSection = 0;
    let rejectAmount = 0;

    const rawRows = rows
      .map((r) => {
        const date = normalizeDate(r.date);
        if (!date) {
          rejectDate++;
          return null;
        }

        const section = normalizeSection(r.section);
        if (!section) {
          rejectSection++;
          return null;
        }

        const amount = normalizeAmount(r.amount);
        if (!amount) {
          rejectAmount++;
          return null;
        }

        const description = String(r.summary ?? "").trim();
        const direction = section === "income" ? "in" : "out";

        // ✅ 重複排除のキー（同一ユーザー内で同一取引を弾く）
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
        {
          error: "No valid rows (date/amount/section invalid)",
          debug: {
            total: rows.length,
            rejectDate,
            rejectSection,
            rejectAmount,
          },
        },
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
    return NextResponse.json({ error: e?.message ?? "unknown error" }, { status: 500 });
  }
}