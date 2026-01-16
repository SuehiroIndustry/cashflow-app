// app/api/overview/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RiskLevel = string; // 'GREEN' | 'YELLOW' | 'RED' など（DB定義に合わせて自由）

type ViewRow = {
  user_id: string;
  cash_account_id: number | string; // bigint が string で返る場合あり
  current_balance: number | string | null;
  month_income: number | string | null;
  month_expense: number | string | null;
  planned_income_30d: number | string | null;
  planned_expense_30d: number | string | null;
  projected_balance_30d: number | string | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  computed_at: string | null; // timestamptz
};

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toInt(v: unknown): number {
  const n = toNumber(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toDateMs(v: unknown): number {
  if (typeof v !== "string" || !v) return -1;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : -1;
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toViewRowArray(data: unknown): ViewRow[] {
  // supabase の data は基本「配列」だが、型エラー回避のため unknown で受けて検証する
  if (!Array.isArray(data)) return [];
  const rows: ViewRow[] = [];

  for (const item of data) {
    if (!isObjectRecord(item)) continue;

    // 必須っぽいキーがあるものだけ採用（雑に全部受けると後で壊れる）
    if (!("current_balance" in item) || !("month_income" in item) || !("month_expense" in item)) continue;

    rows.push(item as unknown as ViewRow);
  }

  return rows;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const accountIdParam = url.searchParams.get("cash_account_id");
  const debug = url.searchParams.get("debug") === "1";

  // cash_account_id は bigint の可能性があるので、"数値として成立するか"だけ見てフィルタ
  const accountIdNum = accountIdParam ? Number(accountIdParam) : NaN;

  let q = supabase
    .from("v_dashboard_overview_user_v2")
    .select(
      [
        "user_id",
        "cash_account_id",
        "current_balance",
        "month_income",
        "month_expense",
        "planned_income_30d",
        "planned_expense_30d",
        "projected_balance_30d",
        "risk_score",
        "risk_level",
        "computed_at",
      ].join(",")
    )
    .eq("user_id", user.id);

  if (Number.isFinite(accountIdNum)) {
    q = q.eq("cash_account_id", accountIdNum);
  }

  // computed_at で新しい順（複数行あっても最新を拾える）
  const { data, error } = await q.order("computed_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: (error as any)?.hint ?? null },
      { status: 500 }
    );
  }

  const rows = toViewRowArray(data);

  // rows が空でも落とさない（UIは0表示で動く）
  // 「全口座合算 or 単一口座」どちらも rows.reduce で吸収する
  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += toNumber(r.current_balance);
      acc.month_income += toNumber(r.month_income);
      acc.month_expense += toNumber(r.month_expense);

      acc.planned_income_30d += toNumber(r.planned_income_30d);
      acc.planned_expense_30d += toNumber(r.planned_expense_30d);

      // projected_balance_30d はビュー側で計算済みの想定。合算は「足す」で扱う。
      acc.projected_balance_30d += toNumber(r.projected_balance_30d);

      // リスク系は「最新の行」を採用（合算しない）
      const ms = toDateMs(r.computed_at);
      if (ms > acc._latestMs) {
        acc._latestMs = ms;
        acc.risk_level = r.risk_level ?? acc.risk_level;
        acc.risk_score = typeof r.risk_score === "number" ? r.risk_score : acc.risk_score;
        acc.computed_at = r.computed_at ?? acc.computed_at;
      }

      return acc;
    },
    {
      current_balance: 0,
      month_income: 0,
      month_expense: 0,
      planned_income_30d: 0,
      planned_expense_30d: 0,
      projected_balance_30d: 0,
      risk_level: "GREEN" as RiskLevel,
      risk_score: 0,
      computed_at: null as string | null,
      _latestMs: -1,
    }
  );

  const net_month = agg.month_income - agg.month_expense;
  const net_planned_30d = agg.planned_income_30d - agg.planned_expense_30d;

  // projected_balance は「見込み残高」：ビューの projected_balance_30d があるならそれを優先
  // （ビューが合算に向かない場合は、ここを current_balance + net_planned_30d に変えてもOK）
  const projected_balance =
    agg.projected_balance_30d !== 0 ? agg.projected_balance_30d : agg.current_balance + net_planned_30d;

  const payload = {
    // 表示用
    current_balance: agg.current_balance,

    month_income: agg.month_income,
    month_expense: agg.month_expense,
    net_month,

    planned_income_30d: agg.planned_income_30d,
    planned_expense_30d: agg.planned_expense_30d,
    net_planned_30d,

    projected_balance,
    projected_balance_30d: agg.projected_balance_30d,

    risk_level: agg.risk_level,
    risk_score: toInt(agg.risk_score),
    computed_at: agg.computed_at,

    // 任意：デバッグ
    ...(debug ? { debug_rows: rows } : {}),
  };

  return NextResponse.json(payload);
}