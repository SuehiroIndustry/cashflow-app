// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = {
  cash_account_id: number;
  current_balance: number | null;
  month_income: number | null;
  month_expense: number | null;
  planned_income_30d: number | null;
  planned_expense_30d: number | null;
  projected_balance_30d: number | null;
  risk_level: string | null;
  risk_score: number | null;
  computed_at: string | null;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ✅ viewの実カラム名に合わせる（あなたのDBのスクショ基準）
  const selectCols = [
    'cash_account_id',
    'current_balance',
    'month_income',
    'month_expense',
    'planned_income_30d',
    'planned_expense_30d',
    'projected_balance_30d',
    'risk_score',
    'risk_level',
    'computed_at',
  ].join(',');

  // ✅ 型定義が追いついてない(viewがDatabase型に無い/古い)ので、ここだけ TS を黙らせる
  const { data, error } = await (supabase as any)
    .from('v_dashboard_overview_user_v2')
    .select(selectCols)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as unknown) as Row[];

  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += n(r.current_balance);
      acc.month_income += n(r.month_income);
      acc.month_expense += n(r.month_expense);
      acc.planned_income_30d += n(r.planned_income_30d);
      acc.planned_expense_30d += n(r.planned_expense_30d);
      acc.projected_balance_30d += n(r.projected_balance_30d);

      const t = r.computed_at ? Date.parse(r.computed_at) : NaN;
      if (Number.isFinite(t) && t > acc._latestTs) {
        acc._latestTs = t;
        acc.computed_at = r.computed_at ?? null;
        acc.risk_level = r.risk_level ?? acc.risk_level;
        acc.risk_score = n(r.risk_score);
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
      risk_level: 'GREEN',
      risk_score: 0,
      computed_at: null as string | null,
      _latestTs: -Infinity,
    }
  );

  return NextResponse.json({
    current_balance: agg.current_balance,
    month_income: agg.month_income,
    month_expense: agg.month_expense,
    planned_income_30d: agg.planned_income_30d,
    planned_expense_30d: agg.planned_expense_30d,
    projected_balance_30d: agg.projected_balance_30d,
    risk_level: agg.risk_level,
    risk_score: agg.risk_score,
    computed_at: agg.computed_at,
  });
}