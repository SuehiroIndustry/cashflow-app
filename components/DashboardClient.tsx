// components/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type CashAccount = {
  id: number;
  name: string;
};

type OverviewRow = {
  cash_account_id: number;
  name: string;
  balance: number;
  month_income: number;
  month_expense: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  risk_level: string;
  computed_at: string;
};

type Props = {
  initialAccounts: CashAccount[];
  initialOverview: OverviewRow[];
};

export default function DashboardClient({ initialAccounts, initialOverview }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  const accounts = useMemo(() => initialAccounts ?? [], [initialAccounts]);
  const overview = useMemo(() => initialOverview ?? [], [initialOverview]);

  useEffect(() => {
    let unsub:
      | { data: { subscription: { unsubscribe: () => void } } }
      | null = null;

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

  if (fatal) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Dashboard Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{fatal}</pre>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 16 }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Cashflow Dashboard</h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          }}
        >
          Logout
        </button>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>Accounts</h2>
        {accounts.length === 0 ? (
          <p>No accounts (cash_accounts is empty or RLS blocked)</p>
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
        {overview.length === 0 ? (
          <p>No overview rows (view is empty or RLS blocked)</p>
        ) : (
          <ul>
            {overview.map((r) => (
              <li key={r.cash_account_id}>
                {r.name} / balance: {r.balance} / month: +{r.month_income} -{r.month_expense} / risk:{' '}
                {r.risk_level}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}