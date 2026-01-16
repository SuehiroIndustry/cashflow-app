// components/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type CashAccount = {
  id: number;
  name: string;
};

type OverviewResponse =
  | {
      mode: 'all';
      current_balance: number;
      month_income: number;
      month_expense: number;
      planned_income: number;
      planned_expense: number;
      projected_balance: number;
      risk_level: string;
      risk_score: number;
      computed_at: string | null;
    }
  | {
      mode: 'account';
      cash_account_id: number;
      current_balance: number;
      month_income: number;
      month_expense: number;
      planned_income: number;
      planned_expense: number;
      projected_balance: number;
      risk_level: string;
      risk_score: number;
      computed_at: string | null;
    };

type Props = {
  initialAccounts: CashAccount[];
};

function yen(n: number) {
  return new Intl.NumberFormat('ja-JP').format(Math.round(n));
}

export default function DashboardClient({ initialAccounts }: Props) {
  const router = useRouter();

  const accounts = useMemo(() => initialAccounts ?? [], [initialAccounts]);

  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  const [mode, setMode] = useState<'all' | 'account'>('all');
  const [cashAccountId, setCashAccountId] = useState<number | null>(
    accounts[0]?.id ?? null
  );

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // auth guard
  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          router.replace('/login');
          return;
        }

        setReady(true);

        unsub = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) router.replace('/login');
        });
      } catch (e: any) {
        setFatal(e?.message ?? 'Unknown auth/session error');
      }
    })();

    return () => {
      try {
        unsub?.data.subscription.unsubscribe();
      } catch {}
    };
  }, [router]);

  // fetch overview
  useEffect(() => {
    if (!ready) return;

    const run = async () => {
      setLoading(true);
      setFatal(null);

      try {
        const qs =
          mode === 'all'
            ? '?mode=all'
            : `?mode=account&cashAccountId=${encodeURIComponent(String(cashAccountId ?? ''))}`;

        const res = await fetch(`/api/overview${qs}`, { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) throw new Error(json?.error ?? `API error: ${res.status}`);

        setOverview(json as OverviewResponse);
      } catch (e: any) {
        setFatal(e?.message ?? 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    };

    // account mode なのにID無いなら何もしない
    if (mode === 'account' && !cashAccountId) return;

    run();
  }, [ready, mode, cashAccountId]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (fatal) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Dashboard Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{fatal}</pre>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Cashflow Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>Accounts</h2>
        {accounts.length === 0 ? (
          <p>No accounts</p>
        ) : (
          <ul>
            {accounts.map((a) => (
              <li key={a.id}>
                #{a.id} {a.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Overview</h2>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            <input
              type="radio"
              checked={mode === 'all'}
              onChange={() => setMode('all')}
            />{' '}
            All
          </label>

          <label>
            <input
              type="radio"
              checked={mode === 'account'}
              onChange={() => setMode('account')}
            />{' '}
            Account
          </label>

          {mode === 'account' && (
            <select
              value={cashAccountId ?? ''}
              onChange={(e) => setCashAccountId(Number(e.target.value))}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} {a.name}
                </option>
              ))}
            </select>
          )}

          <button onClick={() => router.refresh()} disabled={loading}>
            Refresh
          </button>

          {loading && <span>Loading...</span>}
        </div>

        {!overview ? (
          <p style={{ marginTop: 12 }}>No data</p>
        ) : (
          <div style={{ marginTop: 12, lineHeight: 1.8 }}>
            <div>current_balance: ¥{yen(overview.current_balance)}</div>
            <div>
              month: +¥{yen(overview.month_income)} / -¥{yen(overview.month_expense)}
            </div>
            <div>
              planned: +¥{yen(overview.planned_income)} / -¥{yen(overview.planned_expense)}
            </div>
            <div>projected_balance: ¥{yen(overview.projected_balance)}</div>
            <div>
              risk: {overview.risk_level} (score: {overview.risk_score})
            </div>
            <div>computed_at: {overview.computed_at ?? '-'}</div>
          </div>
        )}
      </section>
    </div>
  );
}