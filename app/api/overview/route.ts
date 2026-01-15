// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = {
  user_id: string;
  cash_account_id: number;
  current_balance: number | null;
  income_mtd: number | null;
  expense_mtd: number | null;
  planned_income_30d: number | null;
  planned_expense_30d: number | null;
  projected_balance_30d: number | null;
  risk_level: string | null;
  risk_score: number | null;
  computed_at: string | null;
};

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function calcRisk(projected: number) {
  const risk_score = projected < 0 ? 2 : projected < 100000 ? 1 : 0;
  const risk_level = risk_score === 2 ? 'RED' : risk_score === 1 ? 'YELLOW' : 'GREEN';
  return { risk_level, risk_score };
}

export async function GET(req: Request) {
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
      .select('*')
      .eq('user_id', user.id)
      .eq('cash_account_id', cashAccountId)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = (data?.[0] ?? null) as Row | null;

    return NextResponse.json({
      mode: 'account',
      cash_account_id: cashAccountId,
      current_balance: n(row?.current_balance),
      income_mtd: n(row?.income_mtd),
      expense_mtd: n(row?.expense_mtd),
      planned_income_30d: n(row?.planned_income_30d),
      planned_expense_30d: n(row?.planned_expense_30d),
      projected_balance_30d: n(row?.projected_balance_30d),
      risk_level: row?.risk_level ?? 'GREEN',
      risk_score: n(row?.risk_score),
      computed_at: row?.computed_at ?? null,
    });
  }

  // ===== all mode =====
  const { data, error } = await supabase
    .from('v_dashboard_overview_user_v2')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];

  const agg = rows.reduce(
    (acc, r) => {
      acc.current_balance += n(r.current_balance);
      acc.income_mtd += n(r.income_mtd);
      acc.expense_mtd += n(r.expense_mtd);
      acc.planned_income_30d += n(r.planned_income_30d);
      acc.planned_expense_30d += n(r.planned_expense_30d);
      acc.projected_balance_30d += n(r.projected_balance_30d);

      const t = r.computed_at ? Date.parse(r.computed_at) : NaN;
      if (Number.isFinite(t) && t > acc._latestTs) {
        acc._latestTs = t;
        acc.computed_at = r.computed_at;
      }
      return acc;
    },
    {
      current_balance: 0,
      income_mtd: 0,
      expense_mtd: 0,
      planned_income_30d: 0,
      planned_expense_30d: 0,
      projected_balance_30d: 0,
      computed_at: null as string | null,
      _latestTs: -Infinity,
    }
  );

  const { risk_level, risk_score } = calcRisk(agg.projected_balance_30d);

  return NextResponse.json({
    mode: 'all',
    ...agg,
    risk_level,
    risk_score,
  });
}