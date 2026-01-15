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
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        // セッション無しならログインへ
        if (!data.session) {
          router.replace('/login');
          return;
        }

        setReady(true);

        // auth変化を監視（ログアウトや期限切れ対策）
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

  // 認証確定前に描画しない（これが “落ちる” を大幅に減らす）
  if (!ready) return null;

  // ここからUI（仮：必要なら君のUIに差し替え）
  return (
    <div style={{ padding: 16 }}>
      <h1>Dashboard</h1>

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
        {overview.length === 0 ? (
          <p>No overview rows</p>
        ) : (
          <ul>
            {overview.map((r) => (
              <li key={r.cash_account_id}>
                {r.name} / balance: {r.balance} / month: +{r.month_income} -{r.month_expense} / risk: {r.risk_level}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}