// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = {
  user_id: string;
  cash_account_id: number;
  current_balance: number | null;
  month_income: number | null;
  month_expense: number | null;
  planned_income: number | null;
  planned_expense: number | null;
  projected_balance: number | null;
  risk_score: number | null;
  risk_level: string | null;
  computed_at: string | null;
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'all';
  const cashAccountIdParam = url.searchParams.get('cashAccountId');

  // ===== account mode =====
  if (mode === 'account') {
    const cashAccountId = Number(cashAccountIdParam);
    if (!Number.isFinite(cashAccountId)) {
      return NextResponse.json({ error: 'cashAccountId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('v_dashboard_overview_user_v2')
      .select(
        'user_id,cash_account_id,current_balance,month_income,month_expense,planned_income,planned_expense,projected_balance,risk_score,risk_level,computed_at'
      )
      .eq('user_id', user.id)
      .eq('cash_account_id', cashAccountId)
      .limit(1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = (data?.[0] ?? null) as Row | null;

    return NextResponse.json({
      mode: 'account',
      cash_account_id: cashAccountId,
      current_balance: n(row?.current_balance),
      month_income: n(row?.month_income),
      month_expense: n(row?.month_expense),
      planned_income: n(row?.planned_income),
      planned_expense: n(row?.planned_expense),
      projected_balance: n(row?.projected_balance),
      risk_level: row?.risk_level ?? 'GREEN',
      risk_score: n(row?.risk_score),
      computed_at: row?.computed_at ?? null,
    });
  }

  // ===== all mode (default) =====
  const { data, error } = await supabase
    .from('v_dashboard_overview_user_v2')
    .select(
      'user_id,cash_account_id,current_balance,month_income,month_expense,planned_income,planned_expense,projected_balance,risk_score,risk_level,computed_at'
    )
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];

  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += n(r.current_balance);
      acc.month_income += n(r.month_income);
      acc.month_expense += n(r.month_expense);
      acc.planned_income += n(r.planned_income);
      acc.planned_expense += n(r.planned_expense);
      acc.projected_balance += n(r.projected_balance);

      // 最新 computed_at を採用
      const t = r.computed_at ? Date.parse(r.computed_at) : NaN;
      if (Number.isFinite(t) && t > acc._latestTs) {
        acc._latestTs = t;
        acc.computed_at = r.computed_at ?? null;
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
      _latestTs: -Infinity,
    }
  );

  // リスクは「一番危険なもの」を採用（GREEN < YELLOW < RED）
  const worst = rows.reduce(
    (w, r) => Math.max(w, n(r.risk_score)),
    0
  );
  const risk_level = worst >= 2 ? 'RED' : worst === 1 ? 'YELLOW' : 'GREEN';

  return NextResponse.json({
    mode: 'all',
    current_balance: agg.current_balance,
    month_income: agg.month_income,
    month_expense: agg.month_expense,
    planned_income: agg.planned_income,
    planned_expense: agg.planned_expense,
    projected_balance: agg.projected_balance,
    risk_level,
    risk_score: worst,
    computed_at: agg.computed_at,
  });
}