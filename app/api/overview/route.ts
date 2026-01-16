// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type OverviewViewRow = {
  user_id: string;
  cash_account_id: number;
  current_balance: number;
  month_income: number;
  month_expense: number;
  risk_score: number | null;
  risk_level: string | null;
  computed_at: string;
};

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toISODate(d: Date): string {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
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
  const accountIdParam = url.searchParams.get('accountId');
  const accountId = accountIdParam ? Number(accountIdParam) : null;

  // ① view から「現状」と「今月」を取る（口座指定なら絞る）
  let q = supabase.from('v_dashboard_overview_user_v2').select('*') as any;
  q = q.eq('user_id', user.id);
  if (accountId && Number.isFinite(accountId)) {
    q = q.eq('cash_account_id', accountId);
  }

  const { data: viewRowsRaw, error: viewErr } = await q;
  if (viewErr) {
    return NextResponse.json({ error: viewErr.message }, { status: 500 });
  }

  const viewRows = (viewRowsRaw ?? []) as OverviewViewRow[];

  // view が1行も返さないケース（初期状態）でも落とさない
  const baseAgg = viewRows.reduce(
    (acc, r) => {
      acc.current_balance += toNumber(r.current_balance);
      acc.month_income += toNumber(r.month_income);
      acc.month_expense += toNumber(r.month_expense);

      // computed_at は最新を採用
      if (!acc.computed_at || new Date(r.computed_at) > new Date(acc.computed_at)) {
        acc.computed_at = r.computed_at;
      }

      // risk は「代表値」として先頭優先（複数口座なら後で改善も可）
      if (!acc.risk_level) acc.risk_level = r.risk_level ?? 'GREEN';
      if (acc.risk_score === null || acc.risk_score === undefined) acc.risk_score = r.risk_score ?? 0;

      return acc;
    },
    {
      current_balance: 0,
      month_income: 0,
      month_expense: 0,
      computed_at: null as string | null,
      risk_level: null as string | null,
      risk_score: null as number | null,
    }
  );

  // ② planned_cash_flows から「今日〜30日」の予定を合算
  const today = new Date();
  const start = toISODate(today);
  const end = toISODate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)); // 30日後

  let pq = supabase
    .from('planned_cash_flows')
    .select('flow_type, amount, planned_date, cash_account_id')
    .eq('user_id', user.id)
    .gte('planned_date', start)
    .lte('planned_date', end);

  if (accountId && Number.isFinite(accountId)) {
    // planned 側も口座指定に合わせる（null は “全体予定” 扱いにしたい場合は OR にする）
    pq = pq.eq('cash_account_id', accountId);
  }

  const { data: plannedRows, error: plannedErr } = await pq;
  if (plannedErr) {
    return NextResponse.json({ error: plannedErr.message }, { status: 500 });
  }

  const plannedAgg = (plannedRows ?? []).reduce(
    (acc, r: any) => {
      const amt = toNumber(r.amount);
      if (r.flow_type === 'income') acc.income += amt;
      if (r.flow_type === 'expense') acc.expense += amt;
      return acc;
    },
    { income: 0, expense: 0 }
  );

  const planned_income_30d = plannedAgg.income;
  const planned_expense_30d = plannedAgg.expense;

  // 互換：既存UIが planned_income / planned_expense を参照してても死なないように同値で返す
  const planned_income = planned_income_30d;
  const planned_expense = planned_expense_30d;

  const projected_balance_30d =
    baseAgg.current_balance + planned_income_30d - planned_expense_30d;

  // 互換：projected_balance も 30d と同じ扱い
  const projected_balance = projected_balance_30d;

  return NextResponse.json({
    current_balance: baseAgg.current_balance,
    month_income: baseAgg.month_income,
    month_expense: baseAgg.month_expense,

    planned_income,
    planned_expense,
    planned_income_30d,
    planned_expense_30d,

    projected_balance,
    projected_balance_30d,

    risk_level: baseAgg.risk_level ?? 'GREEN',
    risk_score: baseAgg.risk_score ?? 0,
    computed_at: baseAgg.computed_at,
  });
}