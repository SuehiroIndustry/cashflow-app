// app/api/overview/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RiskLevel = string;

type ViewRow = {
  user_id: string;
  cash_account_id: number | string; // bigint が string で返る場合あり
  current_balance: number | string | null;

  month_income: number | string | null;
  month_expense: number | string | null;

  planned_income_30d: number | string | null;
  planned_expense_30d: number | string | null;
  projected_balance_30d: number | string | null;

  risk_score: number | string | null;
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
  return Math.trunc(toNumber(v));
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
    if (!("cash_account_id" in item) || !("current_balance" in item)) continue;
    rows.push(item as unknown as ViewRow);
  }
  return rows;
}

/**
 * ✅ API仕様（固定）
 * GET /api/overview
 * - accountId 未指定 or "all" → 全口座合算
 * - accountId=number → 単一口座
 * - debug=1 → debug_rows を返す
 *
 * 互換：cash_account_id でも受ける（古いフロントがいても壊さない）
 */
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

  const accountIdRaw =
    url.searchParams.get("accountId") ?? url.searchParams.get("cash_account_id"); // backward compat

  const debug = url.searchParams.get("debug") === "1";

  const accountIdNormalized = (accountIdRaw ?? "").trim().toLowerCase();
  const isAll =
    accountIdNormalized === "" || accountIdNormalized === "all" || accountIdNormalized === "null";

  const accountIdNum = isAll ? NaN : Number(accountIdRaw);

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

  // 複数行あっても「最新」を拾えるように
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

      // 30d見込み残高（ビュー計算済み前提）
      acc.projected_balance_30d += toNumber(r.projected_balance_30d);

      // リスク系は「最新行」を採用
      const ms = toDateMs(r.computed_at);
      if (ms > acc._latestMs) {
        acc._latestMs = ms;
        acc.risk_level = r.risk_level ?? acc.risk_level;
        acc.risk_score = toNumber(r.risk_score);
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

  // ここは「30日見込み」を planned_* としても扱う（フロント互換＆分かりやすさ優先）
  const planned_income = agg.planned_income_30d;
  const planned_expense = agg.planned_expense_30d;
  const net_planned_30d = planned_income - planned_expense;

  // projected_balance は「見込み残高」：ビュー値があればそれ優先、無ければ自前で算出
  const projected_balance =
    agg.projected_balance_30d !== 0
      ? agg.projected_balance_30d
      : agg.current_balance + net_planned_30d;

  const payload = {
    // ✅ DashboardClient の型に合わせる
    current_balance: toInt(agg.current_balance),

    month_income: toInt(agg.month_income),
    month_expense: toInt(agg.month_expense),

    planned_income: toInt(planned_income),
    planned_expense: toInt(planned_expense),
    projected_balance: toInt(projected_balance),

    planned_income_30d: toInt(agg.planned_income_30d),
    planned_expense_30d: toInt(agg.planned_expense_30d),
    projected_balance_30d: toInt(agg.projected_balance_30d),

    risk_level: agg.risk_level,
    risk_score: toInt(agg.risk_score),
    computed_at: agg.computed_at,

    // ついでに：デバッグや確認用（フロントが欲しければ表示できる）
    net_month: toInt(net_month),
    net_planned_30d: toInt(net_planned_30d),

    ...(debug ? { debug_rows: rows } : {}),
  };

  return NextResponse.json(payload);
}