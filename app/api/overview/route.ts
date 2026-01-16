// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function toNumber(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = row[k];
    // null/undefined/'' は無視
    if (v === null || v === undefined || v === '') continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickString(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return '';
}

function pickDateIso(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
    if (v instanceof Date) return v.toISOString();
  }
  return null;
}

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

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  // 認証チェック
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

  // クエリパラメータ（accountId 任意）
  const url = new URL(req.url);
  const accountIdStr = url.searchParams.get('accountId');
  const accountIdNum = accountIdStr ? Number(accountIdStr) : NaN;

  // v_dashboard_overview_user_v2 から取得（All / 1 account 両対応）
  let q = supabase
    .from('v_dashboard_overview_user_v2')
    .select(
      [
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

  if (Number.isFinite(accountIdNum)) {
    q = q.eq('cash_account_id', accountIdNum);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /**
   * ★ここが今回の修正ポイント
   * Supabase の data は union が混ざるので、直接 cast すると Vercel(TS) で死ぬことがある。
   * 一回 unknown に落としてから Array 判定 → 安全に rows を作る。
   */
  const raw = data as unknown;
  const rows: Record<string, unknown>[] = Array.isArray(raw)
    ? (raw as Record<string, unknown>[])
    : [];

  // 合算（All accounts / 1 account 両対応）
  const agg = rows.reduce<Agg>(
    (acc, r) => {
      acc.current_balance += pickNumber(r, ['current_balance']);
      acc.month_income += pickNumber(r, ['month_income']);
      acc.month_expense += pickNumber(r, ['month_expense']);

      // v2 の列名を吸収（plain と *_30d 両方を拾う）
      acc.planned_income += pickNumber(r, ['planned_income']);
      acc.planned_expense += pickNumber(r, ['planned_expense']);
      acc.projected_balance += pickNumber(r, ['projected_balance']);

      acc.planned_income_30d += pickNumber(r, ['planned_income_30d']);
      acc.planned_expense_30d += pickNumber(r, ['planned_expense_30d']);
      acc.projected_balance_30d += pickNumber(r, ['projected_balance_30d']);

      // computed_at は最新を採用
      const computedAt = pickDateIso(r, ['computed_at']);
      if (!acc.computed_at || (computedAt && computedAt > acc.computed_at)) {
        acc.computed_at = computedAt ?? acc.computed_at;
      }

      // risk は「最新の値」を採用（合算しない）
      const riskLevel = pickString(r, ['risk_level']);
      if (riskLevel) acc.risk_level = riskLevel;

      const riskScore = pickNumber(r, ['risk_score']);
      acc.risk_score = riskScore; // 最新値扱い（必要なら max に変える）

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

  /**
   * plain が 0 で *_30d だけ入っているケースがあるので UI が壊れないように寄せる
   * （どっちも 0 のときは 0 のまま）
   */
  const planned_income = agg.planned_income || agg.planned_income_30d;
  const planned_expense = agg.planned_expense || agg.planned_expense_30d;
  const projected_balance =
    agg.projected_balance ||
    agg.projected_balance_30d ||
    agg.current_balance + planned_income - planned_expense;

  return NextResponse.json({
    current_balance: toNumber(agg.current_balance),
    month_income: toNumber(agg.month_income),
    month_expense: toNumber(agg.month_expense),

    planned_income: toNumber(planned_income),
    planned_expense: toNumber(planned_expense),
    projected_balance: toNumber(projected_balance),

    planned_income_30d: toNumber(agg.planned_income_30d),
    planned_expense_30d: toNumber(agg.planned_expense_30d),
    projected_balance_30d: toNumber(agg.projected_balance_30d),

    risk_level: agg.risk_level || 'GREEN',
    risk_score: toNumber(agg.risk_score),
    computed_at: agg.computed_at,
  });
}