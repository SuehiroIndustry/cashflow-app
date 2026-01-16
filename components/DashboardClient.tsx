// components/DashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type CashAccount = {
  id: number;
  name: string;
};

type OverviewApiAll = {
  mode: 'all';
  current_balance: number;
  income_mtd: number;
  expense_mtd: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  projected_balance_30d: number;
  risk_level: string;
  risk_score: number;
  computed_at: string | null;
};

type OverviewApiAccount = {
  mode: 'account';
  cash_account_id: number;
  current_balance: number;
  income_mtd: number;
  expense_mtd: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  projected_balance_30d: number;
  risk_level: string;
  risk_score: number;
  computed_at: string | null;
};

type Props = {
  initialAccounts: CashAccount[];
};

function yen(n: number) {
  try {
    return new Intl.NumberFormat('ja-JP').format(n);
  } catch {
    return String(n);
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? `Request failed: ${res.status}`);
  }
  return json as T;
}

export default function DashboardClient({ initialAccounts }: Props) {
  const router = useRouter();

  const accounts = useMemo(() => initialAccounts ?? [], [initialAccounts]);

  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  const [all, setAll] = useState<OverviewApiAll | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [accountDetail, setAccountDetail] = useState<OverviewApiAccount | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 認証 + ALL overview 読み込み
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

        // ALL overview
        const allRes = await fetchJson<OverviewApiAll>('/api/overview?mode=all');
        setAll(allRes);

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

  async function onSelectAccount(id: number) {
    setSelectedId(id);
    setLoadingDetail(true);
    setAccountDetail(null);

    try {
      const detail = await fetchJson<OverviewApiAccount>(`/api/overview?mode=account&cashAccountId=${id}`);
      setAccountDetail(detail);
    } catch (e: any) {
      setFatal(e?.message ?? 'Failed to load account detail');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function onLogout() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace('/login');
    }
  }

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
        <h1>Cashflow Dashboard</h1>
        <button onClick={onLogout}>Logout</button>
      </div>

      <section style={{ marginTop: 16 }}>
        <h2>Accounts</h2>
        {accounts.length === 0 ? (
          <p>No accounts</p>
        ) : (
          <ul>
            {accounts.map((a) => (
              <li key={a.id} style={{ marginBottom: 6 }}>
                <button
                  onClick={() => onSelectAccount(a.id)}
                  style={{
                    cursor: 'pointer',
                    textDecoration: selectedId === a.id ? 'underline' : 'none',
                  }}
                >
                  #{a.id} {a.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Overview (ALL)</h2>
        {!all ? (
          <p>Loading...</p>
        ) : (
          <div>
            <div>current_balance: {yen(all.current_balance)}</div>
            <div>
              month: +{yen(all.income_mtd)} / -{yen(all.expense_mtd)}
            </div>
            <div>
              30d planned: +{yen(all.planned_income_30d)} / -{yen(all.planned_expense_30d)}
            </div>
            <div>30d projected: {yen(all.projected_balance_30d)}</div>
            <div>risk: {all.risk_level} (score {all.risk_score})</div>
            <div>computed_at: {all.computed_at ?? '-'}</div>
          </div>
        )}
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Selected Account</h2>
        {!selectedId ? (
          <p>口座をクリックしてね</p>
        ) : loadingDetail ? (
          <p>Loading...</p>
        ) : !accountDetail ? (
          <p>No data</p>
        ) : (
          <div>
            <div>cash_account_id: {accountDetail.cash_account_id}</div>
            <div>current_balance: {yen(accountDetail.current_balance)}</div>
            <div>
              month: +{yen(accountDetail.income_mtd)} / -{yen(accountDetail.expense_mtd)}
            </div>
            <div>
              30d planned: +{yen(accountDetail.planned_income_30d)} / -{yen(accountDetail.planned_expense_30d)}
            </div>
            <div>30d projected: {yen(accountDetail.projected_balance_30d)}</div>
            <div>risk: {accountDetail.risk_level} (score {accountDetail.risk_score})</div>
            <div>computed_at: {accountDetail.computed_at ?? '-'}</div>
          </div>
        )}
      </section>
    </div>
  );
}