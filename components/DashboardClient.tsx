'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type CashAccount = {
  id: number;
  name: string;
};

export type Overview = {
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

type Props = {
  initialAccounts: CashAccount[];
  initialOverview: Overview | null;
};

export default function DashboardClient({ initialAccounts, initialOverview }: Props) {
  const [accounts] = useState<CashAccount[]>(initialAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all');
  const [overview, setOverview] = useState<Overview | null>(initialOverview);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountOptions = useMemo(() => {
    return [{ id: 'all' as const, name: 'All accounts' }, ...accounts.map(a => ({ id: a.id, name: a.name }))];
  }, [accounts]);

  const fetchOverview = useCallback(async (accountId: number | 'all') => {
    setLoading(true);
    setError(null);

    try {
      const qs = accountId === 'all' ? '' : `?cash_account_id=${accountId}`;
      const res = await fetch(`/api/overview${qs}`, { cache: 'no-store' });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : 'Failed to fetch overview';
        throw new Error(msg);
      }

      setOverview(json as Overview);
    } catch (e) {
      setOverview(null);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (overview == null) {
      fetchOverview(selectedAccountId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApply = async () => {
    await fetchOverview(selectedAccountId);
  };

  const onRefresh = async () => {
    await fetchOverview(selectedAccountId);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Cashflow Dashboard</h1>

        <button onClick={onRefresh} disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label>
            Accounts:&nbsp;
            <select
              value={selectedAccountId === 'all' ? 'all' : String(selectedAccountId)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedAccountId(v === 'all' ? 'all' : Number(v));
              }}
              disabled={loading}
            >
              {accountOptions.map((o) => (
                <option key={String(o.id)} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <button onClick={onApply} disabled={loading} style={{ padding: '6px 10px' }}>
            Apply
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {error && (
          <div style={{ padding: 12, border: '1px solid #a33', borderRadius: 8, marginBottom: 12 }}>
            Dashboard Error<br />
            {error}
          </div>
        )}

        {!error && overview == null && (
          <div style={{ padding: 12, border: '1px solid #555', borderRadius: 8 }}>
            Overview is not loaded yet.
          </div>
        )}

        {!error && overview != null && (
          <div style={{ padding: 12, border: '1px solid #555', borderRadius: 8 }}>
            <div>current_balance: ¥{overview.current_balance.toLocaleString()}</div>
            <div>
              month: +¥{overview.month_income.toLocaleString()} / -¥{overview.month_expense.toLocaleString()}
            </div>
            <div>
              planned(30d): +¥{overview.planned_income_30d.toLocaleString()} / -¥{overview.planned_expense_30d.toLocaleString()}
            </div>
            <div>projected_balance: ¥{overview.projected_balance.toLocaleString()}</div>
            <div>
              risk: {overview.risk_level} (score: {overview.risk_score})
            </div>
            <div>computed_at: {overview.computed_at ?? '(null)'}</div>

            <details style={{ marginTop: 12 }}>
              <summary>Debug (API response)</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(overview, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}