// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET() {
  const supabase = createSupabaseServerClient();

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

  const { data, error } = await supabase
    .from('v_dashboard_overview_user_v2')
    .select(
      `
      cash_account_id,
      current_balance,
      month_income,
      month_expense,
      planned_income,
      planned_expense,
      projected_balance,
      risk_score,
      risk_level,
      computed_at
    `
    )
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];

  const agg = rows.reduce(
    (acc, r: any) => {
      acc.current_balance += n(r.current_balance);
      acc.month_income += n(r.month_income);
      acc.month_expense += n(r.month_expense);
      acc.planned_income += n(r.planned_income);
      acc.planned_expense += n(r.planned_expense);
      acc.projected_balance += n(r.projected_balance);

      if (!acc.computed_at || r.computed_at > acc.computed_at) {
        acc.computed_at = r.computed_at;
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
      computed_at: null as string | null,
    }
  );

  return NextResponse.json({
    current_balance: agg.current_balance,
    month_income: agg.month_income,
    month_expense: agg.month_expense,
    planned_income: agg.planned_income,
    planned_expense: agg.planned_expense,
    projected_balance: agg.projected_balance,
    risk_level: rows[0]?.risk_level ?? 'GREEN',
    risk_score: rows[0]?.risk_score ?? 0,
    computed_at: agg.computed_at,
  });
}