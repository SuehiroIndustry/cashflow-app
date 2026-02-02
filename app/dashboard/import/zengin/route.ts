// app/api/import/zengin/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BodyRow = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  summary: string;
};

type Body = {
  cashAccountId: number;
  sourceType?: string; // "import" を想定
  rows: BodyRow[];
};

function isISODate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toInt(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? Math.trunc(v) : 0;
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // ✅ 認証チェック
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }
    const user = auth.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    const cashAccountId = toInt(body.cashAccountId);
    const sourceType = body.sourceType === "import" ? "import" : "import";
    const rows = Array.isArray(body.rows) ? body.rows : [];

    if (!cashAccountId) {
      return NextResponse.json({ error: "cashAccountId is required" }, { status: 400 });
    }
    if (!rows.length) {
      return NextResponse.json({ error: "rows is empty" }, { status: 400 });
    }

    // ✅ DB制約に合わせる
    // - cash_flows.source_type は NOT NULL
    // - manual の場合のみ cash_category_id 必須（import は null OK）
    // - section は 'income'/'expense' でOK（あなたの constraint / recalc 関数に合わせ）
    const insertRows = rows.map((r) => ({
      user_id: user.id,
      cash_account_id: cashAccountId,
      date: isISODate(r.date) ? r.date : null,
      section: r.section === "income" ? "income" : "expense",
      amount: toInt(r.amount),
      description: typeof r.summary === "string" ? r.summary : "",
      source_type: sourceType,
      // cash_category_id: null, // import は null でOK
    }));

    // date が null の行があると死ぬので弾く
    const bad = insertRows.find((r) => !r.date);
    if (bad) {
      return NextResponse.json(
        { error: "Invalid date row exists", bad },
        { status: 400 }
      );
    }

    // ✅ 大量insert対策：分割して投入（Supabaseの制限回避）
    const CHUNK = 500;
    let inserted = 0;

    for (let i = 0; i < insertRows.length; i += CHUNK) {
      const chunk = insertRows.slice(i, i + CHUNK);
      const { error } = await supabase.from("cash_flows").insert(chunk);

      if (error) {
        return NextResponse.json(
          { error: error.message, hint: error.hint, details: error.details },
          { status: 400 }
        );
      }
      inserted += chunk.length;
    }

    // ✅ 月次集計などを更新したいならここで RPC 呼べる（今は最小でOK）

    return NextResponse.json({ inserted }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/import/zengin] error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// （同一オリジン想定だけど、念のため OPTIONS も用意しとくと事故らない）
export async function OPTIONS() {
  return NextResponse.json({}, { status: 204 });
}