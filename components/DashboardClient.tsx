// components/DashboardClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';   // ← これが正しい

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

  useEffect(() => {
    let unsub: any = null;

    async function checkSession() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!sessionData.session) {
          router.replace('/login');
          return;
        }
        setReady(true);

        unsub = supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) router.replace('/login');
        });
      } catch (e: any) {
        setFatal(e.message ?? 'Failed to check session.');
      }
    }

    checkSession();

    return () => {
      if (unsub && typeof unsub?.unsubscribe === 'function') {
        unsub.unsubscribe();
      }
    };
  }, [router]);

  if (fatal) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Dashboard Error</h2>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{fatal}</pre>
      </div>
    );
  }

  if (!ready) return null;

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard</h1>

      <section>
        <h2>Accounts</h2>
        {initialAccounts.length === 0 ? (
          <p>No accounts</p>
        ) : (
          <ul>
            {initialAccounts.map((a) => (
              <li key={a.id}>
                #{a.id} {a.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Overview</h2>
        {initialOverview.length === 0 ? (
          <p>No overview rows</p>
        ) : (
          <ul>
            {initialOverview.map((r) => (
              <li key={r.cash_account_id}>
                {r.name} / balance: {r.balance} / risk: {r.risk_level}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}