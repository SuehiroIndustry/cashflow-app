// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Agg = {
  current_balance: number;
  month_income: number;
  month_expense: number;

  planned_income: number;
  planned_expense: number;
  projected_balance: number;

  planned_income_30d: number;
  planned_expense_30d: number;
  projected_balance_30d: number;

  risk_level: string;
  risk_score: number;
  computed_at: string | null;
};

function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function toString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function toISO(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function pickNumber(r: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    if (k in r) return toNumber(r[k]);
  }
  return 0;
}

function pickString(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    if (k in r) return toString(r[k]);
  }
  return null;
}

function pickDate(r: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    if (k in r) return toISO(r[k]);
  }
  return null;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const accountIdRaw = url.searchParams.get('accountId');
  const accountIdNum = accountIdRaw ? Number(accountIdRaw) : null;

  // v_dashboard_overview_user_v2 から読む（あなたの画面のエラー文に出てる view 名）
  let q = supabase
    .from('v_dashboard_overview_user_v2')
    .select(
      [
        'cash_account_id',
        'current_balance',
        'month_income',
        'month_expense',

        // v2の揺れ吸収：plain / 30d 両方読む前提
        'planned_income',
        'planned_expense',
        'projected_balance',
        'planned_income_30d',
        'planned_expense_30d',
        'projected_balance_30d',

        'risk_level',
        'risk_score',
        'computed_at',
        'user_id',
      ].join(',')
    )
    .eq('user_id', user.id);

  if (accountIdNum != null && Number.isFinite(accountIdNum)) {
    q = q.eq('cash_account_id', accountIdNum);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ✅ Row[] を名乗らない。unknown[]で受ける。
  const rowsUnknown: unknown[] = Array.isArray(data) ? (data as unknown[]) : [];

  const agg = rowsUnknown.reduce<Agg>(
    (acc, row) => {
      const r = asRecord(row);
      if (!r) return acc;

      acc.current_balance += pickNumber(r, ['current_balance']);
      acc.month_income += pickNumber(r, ['month_income']);
      acc.month_expense += pickNumber(r, ['month_expense']);

      // plain / 30d 両方吸収
      acc.planned_income += pickNumber(r, ['planned_income']);
      acc.planned_expense += pickNumber(r, ['planned_expense']);
      acc.projected_balance += pickNumber(r, ['projected_balance']);

      acc.planned_income_30d += pickNumber(r, ['planned_income_30d']);
      acc.planned_expense_30d += pickNumber(r, ['planned_expense_30d']);
      acc.projected_balance_30d += pickNumber(r, ['projected_balance_30d']);

      // risk は「最新の行」を採用したいので、computed_at が新しいものを優先
      const computedAt = pickDate(r, ['computed_at']);

      if (!acc.computed_at || (computedAt && computedAt > acc.computed_at)) {
        acc.computed_at = computedAt ?? acc.computed_at;
        const riskLevel = pickString(r, ['risk_level']);
        if (riskLevel) acc.risk_level = riskLevel;
        acc.risk_score = pickNumber(r, ['risk_score']);
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

      risk_level: 'GREEN',
      risk_score: 0,
      computed_at: null,
    }
  );

  // UI都合：plainが0で30dにしか入ってない場合もあるので統合値を返す
  const planned_income = agg.planned_income || agg.planned_income_30d;
  const planned_expense = agg.planned_expense || agg.planned_expense_30d;

  const projected_balance =
    agg.projected_balance ||
    agg.projected_balance_30d ||
    (agg.current_balance + planned_income - planned_expense);

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