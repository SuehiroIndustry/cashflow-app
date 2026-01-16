// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = {
  cash_account_id: number;
  current_balance: number | null;
  month_income: number | null;
  month_expense: number | null;

  // v_dashboard_overview_user_v2 の実カラム（あなたのDB側がこうなってる）
  planned_income: number | null;
  planned_expense: number | null;
  projected_balance: number | null;

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

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const selectCols = [
    'cash_account_id',
    'current_balance',
    'month_income',
    'month_expense',
    'planned_income',
    'planned_expense',
    'projected_balance',
    'risk_score',
    'risk_level',
    'computed_at',
  ].join(',');

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

      acc.planned_income += n(r.planned_income);
      acc.planned_expense += n(r.planned_expense);
      acc.projected_balance += n(r.projected_balance);

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
      planned_income: 0,
      planned_expense: 0,
      projected_balance: 0,
      risk_level: 'GREEN',
      risk_score: 0,
      computed_at: null as string | null,
      _latestTs: -Infinity,
    }
  );

  // ✅ 互換性のため “両方のキー” を返す（UIがどっちを読んでもNaNにならない）
  return NextResponse.json({
    current_balance: agg.current_balance,
    month_income: agg.month_income,
    month_expense: agg.month_expense,

    planned_income: agg.planned_income,
    planned_expense: agg.planned_expense,
    projected_balance: agg.projected_balance,

    // 旧/別実装互換（_30d を期待している場合）
    planned_income_30d: agg.planned_income,
    planned_expense_30d: agg.planned_expense,
    projected_balance_30d: agg.projected_balance,

    risk_level: agg.risk_level,
    risk_score: agg.risk_score,
    computed_at: agg.computed_at,
  });
}