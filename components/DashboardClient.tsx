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

  risk_level: string; // "GREEN" | "YELLOW" | "RED" etc
  risk_score: number;
  computed_at: string | null;
};

type Props = {
  initialAccounts: CashAccount[];
  initialOverview: Overview | null;
};

function yen(n: number) {
  return `¥${Math.round(n).toLocaleString()}`;
}

function net(income: number, expense: number) {
  return income - expense;
}

function riskBadgeStyle(level: string) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 999,
    border: '1px solid #333',
    background: '#0b0b0b',
    fontSize: 12,
    lineHeight: 1,
    letterSpacing: 0.3,
    userSelect: 'none',
  };

  // 色は極力控えめ（ダークUI前提）
  if (level === 'RED') return { ...base, borderColor: '#6b1b1b' };
  if (level === 'YELLOW') return { ...base, borderColor: '#6b5a1b' };
  return { ...base, borderColor: '#1b6b2a' }; // GREEN/others
}

function cardStyle(): React.CSSProperties {
  return {
    border: '1px solid #222',
    background: '#0b0b0b',
    borderRadius: 14,
    padding: 14,
  };
}

function statLabelStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 6,
  };
}

function statValueStyle(): React.CSSProperties {
  return {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 0.2,
  };
}

export default function DashboardClient({ initialAccounts, initialOverview }: Props) {
  const [accounts] = useState<CashAccount[]>(initialAccounts);

  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all');
  const [overview, setOverview] = useState<Overview | null>(initialOverview);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV !== 'production';

  const accountOptions = useMemo(() => {
    return [{ id: 'all' as const, name: 'All accounts' }, ...accounts.map((a) => ({ id: a.id, name: a.name }))];
  }, [accounts]);

  const fetchOverview = useCallback(async (accountId: number | 'all') => {
    setLoading(true);
    setError(null);

    try {
      const qs = accountId === 'all' ? '' : `?accountId=${accountId}`;
      const res = await fetch(`/api/overview${qs}`, { cache: 'no-store' });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = typeof (json as any)?.error === 'string' ? (json as any).error : 'Failed to fetch overview';
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

  const monthNet = overview ? net(overview.month_income, overview.month_expense) : 0;
  const planned30dNet = overview ? net(overview.planned_income_30d, overview.planned_expense_30d) : 0;

  // “今後30日” を主役として扱う（DBに month projected が無い前提でもUIが破綻しない）
  const projectedMain = overview ? (overview.projected_balance_30d || overview.projected_balance) : 0;

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Cashflow Dashboard</h1>
          <div style={{ marginTop: 6, color: '#9a9a9a', fontSize: 12 }}>
            {overview?.computed_at ? `computed_at: ${overview.computed_at}` : 'computed_at: (not yet)'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {overview && (
            <span style={riskBadgeStyle(overview.risk_level)}>
              <strong style={{ fontSize: 12 }}>{overview.risk_level}</strong>
              <span style={{ color: '#9a9a9a' }}>score: {overview.risk_score}</span>
            </span>
          )}

          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #2a2a2a',
              background: '#111',
              color: '#eaeaea',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginTop: 16, ...cardStyle() }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#a0a0a0', fontSize: 12 }}>Accounts</span>
            <select
              value={selectedAccountId === 'all' ? 'all' : String(selectedAccountId)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedAccountId(v === 'all' ? 'all' : Number(v));
              }}
              disabled={loading}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid #2a2a2a',
                background: '#0f0f0f',
                color: '#eaeaea',
                minWidth: 220,
              }}
            >
              {accountOptions.map((o) => (
                <option key={String(o.id)} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={onApply}
            disabled={loading}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #2a2a2a',
              background: '#151515',
              color: '#eaeaea',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Apply
          </button>

          <div style={{ color: '#777', fontSize: 12 }}>
            {selectedAccountId === 'all' ? 'All accounts selected' : `Account ID: ${selectedAccountId}`}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ marginTop: 16 }}>
        {error && (
          <div style={{ padding: 14, border: '1px solid #6b1b1b', borderRadius: 14, background: '#0b0b0b' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Dashboard Error</div>
            <div style={{ color: '#e0b4b4' }}>{error}</div>
          </div>
        )}

        {!error && overview == null && (
          <div style={{ padding: 14, border: '1px solid #2a2a2a', borderRadius: 14, background: '#0b0b0b' }}>
            Overview is not loaded yet.
          </div>
        )}

        {!error && overview != null && (
          <>
            {/* Stats Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                marginTop: 12,
              }}
            >
              <div style={cardStyle()}>
                <div style={statLabelStyle()}>Current Balance</div>
                <div style={statValueStyle()}>{yen(overview.current_balance)}</div>
                <div style={{ marginTop: 6, color: '#777', fontSize: 12 }}>全口座合算 / 選択口座</div>
              </div>

              <div style={cardStyle()}>
                <div style={statLabelStyle()}>This Month</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#9a9a9a' }}>income</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{yen(overview.month_income)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9a9a9a' }}>expense</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{yen(overview.month_expense)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, color: '#9a9a9a', fontSize: 12 }}>
                  net: <strong style={{ color: '#eaeaea' }}>{yen(monthNet)}</strong>
                </div>
              </div>

              <div style={cardStyle()}>
                <div style={statLabelStyle()}>Planned (Next 30d)</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#9a9a9a' }}>income</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{yen(overview.planned_income_30d)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9a9a9a' }}>expense</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{yen(overview.planned_expense_30d)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, color: '#9a9a9a', fontSize: 12 }}>
                  net: <strong style={{ color: '#eaeaea' }}>{yen(planned30dNet)}</strong>
                </div>
              </div>

              <div style={{ ...cardStyle(), gridColumn: 'span 3' }}>
                <div style={statLabelStyle()}>Projected Balance (Next 30d)</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{yen(projectedMain)}</div>
                <div style={{ marginTop: 6, color: '#777', fontSize: 12 }}>
                  ※ `projected_balance_30d` を優先表示。無ければ `projected_balance` を表示。
                </div>
              </div>
            </div>

            {/* Debug (dev only) */}
            {isDev && (
              <div style={{ marginTop: 12, ...cardStyle() }}>
                <details>
                  <summary style={{ cursor: 'pointer', color: '#9a9a9a' }}>Debug (API response) — dev only</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{JSON.stringify(overview, null, 2)}</pre>
                </details>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}