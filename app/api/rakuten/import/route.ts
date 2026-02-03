// app/api/rakuten/import/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

type BodyRow = {
  date: string; // YYYY-MM-DD
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

function maskEnv(v: string | undefined | null) {
  if (v == null) return null;
  return v.length ? "SET" : "EMPTY";
}

export async function POST(req: Request) {
  try {
    // ===== Debug（env確認用）=====
    if (req.headers.get("x-debug-env") === "1") {
      return NextResponse.json({
        ok: true,
        env: {
          SUPABASE_URL: maskEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
          SUPABASE_ANON_KEY: maskEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          SUPABASE_SERVICE_ROLE_KEY: maskEnv(
            process.env.SUPABASE_SERVICE_ROLE_KEY
          ),
        },
        runtime: {
          nodeEnv: process.env.NODE_ENV ?? null,
          vercelEnv: process.env.VERCEL_ENV ?? null,
        },
      });
    }

    // ===== JSONチェック =====
    if (!req.headers.get("content-type")?.includes("application/json")) {
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

    // ===== Auth（Cookie → user）=====
    const cookieStore = cookies();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase public env is missing" },
        { status: 500 }
      );
    }

    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    const { data: userData, error: userErr } =
      await supabaseAuth.auth.getUser();

    if (userErr || !userData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // ===== Service Role Client =====
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "supabaseKey is required." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // ===== raw rows 作成 =====
    const nowIso = new Date().toISOString();

    const rawRows = rows
      .map((r) => {
        if (
          !isYmd(r.date) ||
          !Number.isFinite(r.amount) ||
          r.amount <= 0
        )
          return null;

        const direction = r.section === "income" ? "in" : "out";
        if (!direction) return null;

        const description = String(r.summary ?? "").trim();
        const rowHash = sha256Hex(
          `${userId}|${r.date}|${direction}|${r.amount}|${description}`
        );

        return {
          user_id: userId,
          imported_at: nowIso,
          txn_date: r.date,
          description,
          amount: r.amount,
          direction,
          balance: null,
          row_hash: rowHash,
          created_at: nowIso,
        };
      })
      .filter(Boolean) as any[];

    if (!rawRows.length) {
      return NextResponse.json(
        { error: "No valid rows" },
        { status: 400 }
      );
    }

    // ===== raw upsert =====
    const { error: rawErr } = await supabase
      .from("rakuten_bank_raw_transactions")
      .upsert(rawRows, { onConflict: "user_id,row_hash" });

    if (rawErr) {
      return NextResponse.json({ error: rawErr.message }, { status: 500 });
    }

    // ===== cash_flows 反映 =====
    const { data, error: rpcErr } = await supabase.rpc(
      "import_rakuten_raw_to_cash_flows",
      { p_cash_account_id: cashAccountId }
    );

    if (rpcErr) {
      return NextResponse.json({ error: rpcErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      raw_rows_received: rawRows.length,
      cash_flows_inserted: data ?? 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}