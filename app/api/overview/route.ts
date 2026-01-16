// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = {
  user_id: string;
  cash_account_id: number | null;
  current_balance: number | null;
  month_income: number | null;
  month_expense: number | null;
  planned_income: number | null;
  planned_expense: number | null;
  projected_balance: number | null;
  // v2 によっては planned_income_30d / planned_expense_30d がある想定
  planned_income_30d?: number | null;
  planned_expense_30d?: number | null;
  projected_balance_30d?: number | null;
  risk_score: number | null;
  risk_level: string | null;
  computed_at: string | null;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pickNumber(obj: any, keys: string[]): number {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return n(obj[k]);
  }
  return 0;
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
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const accountId = url.searchParams.get('account_id'); // optional
  const accountIdNum =
    accountId && accountId !== 'all' ? Number(accountId) : null;

  // v_dashboard_overview_user_v2 を前提（スクショで使ってたやつ）
  let q = supabase
    .from('v_dashboard_overview_user_v2')
    .select(
      [
        'user_id',
        'cash_account_id',
        'current_balance',
        'month_income',
        'month_expense',
        'planned_income',
        'planned_expense',
        'projected_balance',
        'planned_income_30d',
        'planned_expense_30d',
        'projected_balance_30d',
        'risk_score',
        'risk_level',
        'computed_at',
      ].join(',')
    )
    .eq('user_id', user.id);

  if (accountIdNum && Number.isFinite(accountIdNum)) {
    q = q.eq('cash_account_id', accountIdNum);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (Array.isArray(data) ? data : []) as Row[];

  // 合算（All accounts / 1 account の両対応）
  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += n(r.current_balance);
      acc.month_income += n(r.month_income);
      acc.month_expense += n(r.month_expense);

      // v2 の列名ブレを吸収（plain or *_30d）
      acc.planned_income += pickNumber(r as any, ['planned_income']);
      acc.planned_expense += pickNumber(r as any, ['planned_expense']);
      acc.projected_balance += pickNumber(r as any, ['projected_balance']);

      acc.planned_income_30d += pickNumber(r as any, ['planned_income_30d']);
      acc.planned_expense_30d += pickNumber(r as any, ['planned_expense_30d']);
      acc.projected_balance_30d += pickNumber(r as any, [
        'projected_balance_30d',
      ]);

      // computed_at は最新を採用
      if (!acc.computed_at || (r.computed_at && r.computed_at > acc.computed_at)) {
        acc.computed_at = r.computed_at ?? acc.computed_at;
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

      planned_income_30d: 0,
      planned_expense_30d: 0,
      projected_balance_30d: 0,

      computed_at: null as string | null,
    }
  );

  // リスクは rows[0] があればそれ（All の場合は将来ロジックで再計算してもOK）
  const risk_level = rows[0]?.risk_level ?? 'GREEN';
  const risk_score = n(rows[0]?.risk_score);

  return NextResponse.json({
    current_balance: agg.current_balance,
    month_income: agg.month_income,
    month_expense: agg.month_expense,

    planned_income: agg.planned_income,
    planned_expense: agg.planned_expense,
    projected_balance: agg.projected_balance,

    planned_income_30d: agg.planned_income_30d,
    planned_expense_30d: agg.planned_expense_30d,
    projected_balance_30d: agg.projected_balance_30d,

    risk_level,
    risk_score,
    computed_at: agg.computed_at,
  });
}