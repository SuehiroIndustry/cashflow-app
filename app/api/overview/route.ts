// app/api/overview/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function pickNumber(row: Row, keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function pickString(row: Row, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

function pickDate(row: Row, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const accountIdNum = toInt(url.searchParams.get("account_id"));

  // v2 view：列名が環境によって plain と *_30d が混在する前提で吸収
  let q = supabase
    .from("v_dashboard_overview_user_v2")
    .select(
      [
        "cash_account_id",
        "current_balance",
        "month_income",
        "month_expense",
        "planned_income",
        "planned_expense",
        "projected_balance",
        "planned_income_30d",
        "planned_expense_30d",
        "projected_balance_30d",
        "risk_score",
        "risk_level",
        "computed_at",
      ].join(",")
    )
    .eq("user_id", user.id);

  if (accountIdNum !== null && Number.isFinite(accountIdNum)) {
    q = q.eq("cash_account_id", accountIdNum);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: Row[] = Array.isArray(data) ? (data as Row[]) : [];

  // 合算（All accounts / 1 account 両対応）
  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += pickNumber(r, ["current_balance"]);
      acc.month_income += pickNumber(r, ["month_income"]);
      acc.month_expense += pickNumber(r, ["month_expense"]);

      // v2 が plain or 30d どっちでも拾う（UIは両方表示できるように返す）
      acc.planned_income += pickNumber(r, ["planned_income"]);
      acc.planned_expense += pickNumber(r, ["planned_expense"]);
      acc.projected_balance += pickNumber(r, ["projected_balance"]);

      acc.planned_income_30d += pickNumber(r, ["planned_income_30d"]);
      acc.planned_expense_30d += pickNumber(r, ["planned_expense_30d"]);
      acc.projected_balance_30d += pickNumber(r, ["projected_balance_30d"]);

      const computed_at = pickDate(r, ["computed_at"]);
      if (!acc.computed_at || (computed_at && computed_at > acc.computed_at)) {
        acc.computed_at = computed_at;
      }

      // risk は「最新行の値」を採用（合算しない）
      const risk_level = pickString(r, ["risk_level"]);
      if (risk_level) acc.risk_level = risk_level;

      const risk_score = pickNumber(r, ["risk_score"]);
      acc.risk_score = risk_score;

      return acc;
    },
    {
      current_balance: 0,
      month_income: 0,
      month_expense: 0,

      planned_income: 0,
      planned_expense: 0,
      projected_balance: 0,

      planned_income_30d: 0,
      planned_expense_30d: 0,
      projected_balance_30d: 0,

      risk_level: "GREEN",
      risk_score: 0,
      computed_at: null as string | null,
    }
  );

  // plain が 0 で 30d だけ来る、などの崩れを UI 側で避けるため、
  // 「見せる用の planned / projected」をここで合成して返す
  const planned_income = agg.planned_income || agg.planned_income_30d;
  const planned_expense = agg.planned_expense || agg.planned_expense_30d;
  const projected_balance =
    agg.projected_balance ||
    agg.projected_balance_30d ||
    agg.current_balance + planned_income - planned_expense;

  return NextResponse.json({
    current_balance: agg.current_balance,
    month_income: agg.month_income,
    month_expense: agg.month_expense,

    planned_income,
    planned_expense,
    projected_balance,

    planned_income_30d: agg.planned_income_30d,
    planned_expense_30d: agg.planned_expense_30d,
    projected_balance_30d: agg.projected_balance_30d || projected_balance,

    risk_level: agg.risk_level,
    risk_score: agg.risk_score,
    computed_at: agg.computed_at,
  });
}