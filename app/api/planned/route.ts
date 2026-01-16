// app/api/planned/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

type CreatePlannedBody = {
  cash_account_id?: number | null;
  flow_type: 'income' | 'expense';
  amount: number;
  planned_date: string; // YYYY-MM-DD
  memo?: string | null;
};

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from'); // YYYY-MM-DD
  const to = url.searchParams.get('to'); // YYYY-MM-DD
  const accountIdParam = url.searchParams.get('accountId');
  const accountId = accountIdParam ? Number(accountIdParam) : null;

  let q = supabase
    .from('planned_cash_flows')
    .select('id, cash_account_id, flow_type, amount, planned_date, memo, created_at')
    .eq('user_id', user.id)
    .order('planned_date', { ascending: true })
    .order('id', { ascending: true });

  if (from) q = q.gte('planned_date', from);
  if (to) q = q.lte('planned_date', to);
  if (accountId && Number.isFinite(accountId)) q = q.eq('cash_account_id', accountId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as CreatePlannedBody;

  if (!body?.flow_type || !['income', 'expense'].includes(body.flow_type)) {
    return NextResponse.json({ error: 'flow_type must be income or expense' }, { status: 400 });
  }
  if (!body?.planned_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.planned_date)) {
    return NextResponse.json({ error: 'planned_date must be YYYY-MM-DD' }, { status: 400 });
  }

  const amount = toNumber(body.amount, -1);
  if (amount < 0) {
    return NextResponse.json({ error: 'amount must be >= 0' }, { status: 400 });
  }

  const cash_account_id =
    body.cash_account_id === undefined ? null : body.cash_account_id;

  const { data, error } = await supabase
    .from('planned_cash_flows')
    .insert([
      {
        user_id: user.id,
        cash_account_id,
        flow_type: body.flow_type,
        amount,
        planned_date: body.planned_date,
        memo: body.memo ?? null,
      },
    ])
    .select('id, cash_account_id, flow_type, amount, planned_date, memo, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}