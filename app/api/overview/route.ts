// app/api/overview/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RiskLevel = string;

type ViewRow = {
  user_id: string;
  cash_account_id: number | string;
  current_balance: number | string | null;
  month_income: number | string | null;
  month_expense: number | string | null;
  planned_income_30d: number | string | null;
  planned_expense_30d: number | string | null;
  projected_balance_30d: number | string | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  computed_at: string | null;
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
  if (!Array.isArray(data)) return [];
  const rows: ViewRow[] = [];
  for (const item of data) {
    if (!isObjectRecord(item)) continue;
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

  // ✅ 両対応：古いフロントは accountId、新しいのは cash_account_id
  const accountIdParam =
    url.searchParams.get("cash_account_id") ?? url.searchParams.get("accountId");

  const debug = url.searchParams.get("debug") === "1";
  const accountIdNum = accountIdParam ? Number(accountIdParam) : NaN;

  let q = supabase
    .from("v_dashboard_overview_user_v2") // public は supabase 側で解決
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

  const { data, error } = await q.order("computed_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: (error as any)?.hint ?? null },
      { status: 500 }
    );
  }

  const rows = toViewRowArray(data);

  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += toNumber(r.current_balance);
      acc.month_income += toNumber(r.month_income);
      acc.month_expense += toNumber(r.month_expense);

      acc.planned_income_30d += toNumber(r.planned_income_30d);
      acc.planned_expense_30d += toNumber(r.planned_expense_30d);

      acc.projected_balance_30d += toNumber(r.projected_balance_30d);

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

  const projected_balance =
    agg.projected_balance_30d !== 0
      ? agg.projected_balance_30d
      : agg.current_balance + net_planned_30d;

  const payload = {
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

    ...(debug ? { debug_rows: rows } : {}),
  };

  return NextResponse.json(payload);
}