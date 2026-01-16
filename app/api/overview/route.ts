// app/api/overview/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ---- utils ----
function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickNumber(
  row: Record<string, unknown>,
  keys: string[],
  fallback = 0
): number {
  for (const k of keys) {
    const v = row[k];
    if (v === null || v === undefined) continue;

    // numeric string / number
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pickString(
  row: Record<string, unknown>,
  keys: string[],
  fallback: string | null = null
): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') return v;
    // enum-ish values sometimes come as other primitives
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  }
  return fallback;
}

function pickDate(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (v === null || v === undefined) continue;

    if (typeof v === 'string') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    if (v instanceof Date) {
      if (!Number.isNaN(v.getTime())) return v.toISOString();
    }
  }
  return null;
}

// ---- handler ----
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

  // query param: ?cash_account_id=4  (optional)
  const url = new URL(req.url);
  const cashAccountIdRaw = url.searchParams.get('cash_account_id');
  const cashAccountIdNum = cashAccountIdRaw ? Number(cashAccountIdRaw) : NaN;

  // v_dashboard_overview_user_v2 を読む
  // ※ planned_* は plain と *_30d の両方を返す前提
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

  if (Number.isFinite(cashAccountIdNum)) {
    q = q.eq('cash_account_id', cashAccountIdNum);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ✅ ここが今回の肝：Row[] を信じない。安全に unknown として受ける
  const rows: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : [];

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

    risk_level: string | null;
    risk_score: number;

    computed_at: string | null;
  };

  const agg: Agg = rows.reduce<Agg>(
    (acc, r) => {
      acc.current_balance += pickNumber(r, ['current_balance']);
      acc.month_income += pickNumber(r, ['month_income']);
      acc.month_expense += pickNumber(r, ['month_expense']);

      // v2 が plain / 30d 両方ある前提（どっちも取る）
      acc.planned_income += pickNumber(r, ['planned_income']);
      acc.planned_expense += pickNumber(r, ['planned_expense']);
      acc.projected_balance += pickNumber(r, ['projected_balance']);

      acc.planned_income_30d += pickNumber(r, ['planned_income_30d']);
      acc.planned_expense_30d += pickNumber(r, ['planned_expense_30d']);
      acc.projected_balance_30d += pickNumber(r, ['projected_balance_30d']);

      // computed_at は最新を採用
      const computedAt = pickDate(r, ['computed_at']);
      if (
        computedAt &&
        (!acc.computed_at || computedAt > acc.computed_at)
      ) {
        acc.computed_at = computedAt;

        // risk は「最新の1件」を採用（合算しない）
        const rl = pickString(r, ['risk_level']);
        const rs = pickNumber(r, ['risk_score']);
        if (rl) acc.risk_level = rl;
        acc.risk_score = rs;
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

      risk_level: null,
      risk_score: 0,

      computed_at: null,
    }
  );

  // UI が壊れないように plain / 30d の両対応で返す
  // - plain が 0 で 30d だけ入るケースを救う
  const planned_income =
    agg.planned_income !== 0 ? agg.planned_income : agg.planned_income_30d;
  const planned_expense =
    agg.planned_expense !== 0 ? agg.planned_expense : agg.planned_expense_30d;

  const projected_balance =
    agg.projected_balance !== 0
      ? agg.projected_balance
      : agg.projected_balance_30d !== 0
        ? agg.projected_balance_30d
        : agg.current_balance + planned_income - planned_expense;

  return NextResponse.json({
    current_balance: toNumber(agg.current_balance),
    month_income: toNumber(agg.month_income),
    month_expense: toNumber(agg.month_expense),

    planned_income: toNumber(planned_income),
    planned_expense: toNumber(planned_expense),
    projected_balance: toNumber(projected_balance),

    planned_income_30d: toNumber(agg.planned_income_30d),
    planned_expense_30d: toNumber(agg.planned_expense_30d),
    projected_balance_30d: toNumber(
      agg.projected_balance_30d !== 0 ? agg.projected_balance_30d : projected_balance
    ),

    risk_level: agg.risk_level ?? 'GREEN',
    risk_score: toNumber(agg.risk_score),

    computed_at: agg.computed_at,
  });
}