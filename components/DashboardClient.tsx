'use client';

import React, { useEffect, useMemo, useState } from 'react';

type CashAccount = { id: number; name: string };

type OverviewResponse = {
  current_balance: number;
  month_income: number;
  month_expense: number;

  planned_income: number;
  planned_expense: number;
  planned_income_30d: number;
  planned_expense_30d: number;

  projected_balance: number;
  projected_balance_30d: number;

  risk_level: string;
  risk_score: number;
  computed_at: string | null;
};

type PlannedItem = {
  id: number;
  cash_account_id: number | null;
  flow_type: 'income' | 'expense';
  amount: number;
  planned_date: string; // YYYY-MM-DD
  memo: string | null;
  created_at: string;
};

type Props = {
  initialAccounts: CashAccount[];
  initialOverview: any[];
};

function yen(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n);
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export default function DashboardClient({ initialAccounts }: Props) {
  const [accountId, setAccountId] = useState<string>('all');
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // planned form
  const [pAccountId, setPAccountId] = useState<string>(''); // '' = 全体(口座紐づけなし)
  const [pType, setPType] = useState<'income' | 'expense'>('income');
  const [pAmount, setPAmount] = useState<string>('0');
  const [pDate, setPDate] = useState<string>(isoDate(new Date()));
  const [pMemo, setPMemo] = useState<string>('');

  const [plannedList, setPlannedList] = useState<PlannedItem[]>([]);
  const [plannedLoading, setPlannedLoading] = useState(false);
  const [plannedDeletingId, setPlannedDeletingId] = useState<number | null>(null);

  const accountLabel = useMemo(() => {
    if (accountId === 'all') return 'All accounts';
    const n = Number(accountId);
    const a = initialAccounts.find((x) => x.id === n);
    return a ? `#${a.id} ${a.name}` : `Account ${accountId}`;
  }, [accountId, initialAccounts]);

  async function fetchOverview(selectedAccountId?: string) {
    setLoading(true);
    try {
      const aid = selectedAccountId ?? accountId;
      const qs = new URLSearchParams();
      if (aid !== 'all') qs.set('accountId', aid);

      const res = await fetch(`/api/overview?${qs.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load overview');
      setOverview(json as OverviewResponse);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlanned(selectedAccountId?: string) {
    setPlannedLoading(true);
    try {
      const aid = selectedAccountId ?? accountId;
      const today = new Date();
      const from = isoDate(today);
      const to = isoDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000));

      const qs = new URLSearchParams({ from, to });
      if (aid !== 'all') qs.set('accountId', aid);

      const res = await fetch(`/api/planned?${qs.toString()}`, { cache: 'no-store' });
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load planned');
      setPlannedList((json?.items ?? []) as PlannedItem[]);
    } finally {
      setPlannedLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
    fetchPlanned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onApply() {
    await fetchOverview(accountId);
    await fetchPlanned(accountId);
  }

  async function onAddPlanned() {
    const amount = Number(pAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      alert('amount は 0以上の数値にして');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pDate)) {
      alert('日付は YYYY-MM-DD にして');
      return;
    }

    const body = {
      cash_account_id: pAccountId ? Number(pAccountId) : null,
      flow_type: pType,
      amount,
      planned_date: pDate,
      memo: pMemo || null,
    };

    const res = await fetch('/api/planned', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as any;
    if (!res.ok) {
      alert(json?.error ?? 'Failed to add planned');
      return;
    }

    // 入れたら即反映
    setPAmount('0');
    setPMemo('');
    await fetchPlanned(accountId);
    await fetchOverview(accountId);
  }

  async function onDeletePlanned(id: number) {
    const ok = confirm(`この予定（id=${id}）を削除する？`);
    if (!ok) return;

    setPlannedDeletingId(id);
    try {
      const qs = new URLSearchParams({ id: String(id) });
      const res = await fetch(`/api/planned?${qs.toString()}`, { method: 'DELETE' });
      const json = (await res.json()) as any;
      if (!res.ok) {
        alert(json?.error ?? 'Failed to delete planned');
        return;
      }

      // 削除後に再取得
      await fetchPlanned(accountId);
      await fetchOverview(accountId);
    } finally {
      setPlannedDeletingId(null);
    }
  }

  const risk = overview?.risk_level ?? 'GREEN';
  const riskScore = overview?.risk_score ?? 0;

  return (
    <div style={{ padding: 32, color: '#fff', fontFamily: 'ui-sans-serif, system-ui' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        {/* Header card */}
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 20,
            background: 'rgba(0,0,0,0.35)',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Cashflow Dashboard</div>
              <div style={{ opacity: 0.8, marginTop: 4 }}>今日の状態は整った。次は“攻め”を入れよう。</div>
              <div style={{ opacity: 0.6, marginTop: 8, fontSize: 12 }}>
                computed_at: {overview?.computed_at ?? '-'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.16)',
                  fontSize: 12,
                  opacity: 0.9,
                }}
              >
                RISK <b style={{ marginLeft: 8 }}>{risk}</b> <span style={{ opacity: 0.7 }}>(score: {riskScore})</span>
              </div>
              <button
                onClick={() => fetchOverview()}
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Accounts card */}
        <div
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(0,0,0,0.35)',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Accounts</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>口座を絞って Overview を確認できる</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
              }}
            >
              <option value="all">All accounts</option>
              {initialAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  #{a.id} {a.name}
                </option>
              ))}
            </select>
            <button
              onClick={onApply}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <Card title="Current Balance" value={overview ? yen(overview.current_balance) : '-'} subtitle="全口座合算の絞り込み結果" />
          <Card
            title="This Month"
            value={overview ? `${yen(overview.month_income)} / ${yen(overview.month_expense)}` : '-'}
            subtitle="income / expense"
          />
          <Card
            title="Net (Month)"
            value={overview ? yen(overview.month_income - overview.month_expense) : '-'}
            subtitle="income - expense"
          />
          <Card
            title="Planned (30d)"
            value={overview ? `${yen(overview.planned_income_30d)} / ${yen(overview.planned_expense_30d)}` : '-'}
            subtitle="planned income / planned expense"
          />
          <Card
            title="Net (Planned)"
            value={overview ? yen(overview.planned_income_30d - overview.planned_expense_30d) : '-'}
            subtitle="planned income - planned expense"
          />
          <Card
            title="Projected Balance"
            value={overview ? yen(overview.projected_balance_30d) : '-'}
            subtitle="現状 + 予定反映の見込み"
          />
        </div>

        {/* Planned input */}
        <div
          style={{
            marginTop: 18,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Add Planned (30d)</div>

          <div style={{ display: 'grid', gridTemplateColumns: '220px 160px 160px 180px 1fr 140px', gap: 10 }}>
            <select
              value={pAccountId}
              onChange={(e) => setPAccountId(e.target.value)}
              style={inputStyle}
              title="空にすると“全体予定（口座紐づけなし）”"
            >
              <option value="">(No account)</option>
              {initialAccounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  #{a.id} {a.name}
                </option>
              ))}
            </select>

            <select value={pType} onChange={(e) => setPType(e.target.value as any)} style={inputStyle}>
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>

            <input
              value={pAmount}
              onChange={(e) => setPAmount(e.target.value)}
              style={inputStyle}
              placeholder="amount"
              inputMode="numeric"
            />

            <input value={pDate} onChange={(e) => setPDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />

            <input value={pMemo} onChange={(e) => setPMemo(e.target.value)} style={inputStyle} placeholder="memo (optional)" />

            <button
              onClick={onAddPlanned}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(56,189,248,0.18)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Add
            </button>
          </div>

          <div style={{ opacity: 0.6, fontSize: 12, marginTop: 10 }}>
            ※ Apply の口座絞り込みは Overview と Planned 一覧に反映される（現在: {accountLabel}）
          </div>

          {/* Planned list */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Planned List (next 30d)</div>
            {plannedLoading ? (
              <div style={{ opacity: 0.7 }}>loading...</div>
            ) : plannedList.length === 0 ? (
              <div style={{ opacity: 0.65 }}>予定なし（だから planned が 0/0）</div>
            ) : (
              <div style={{ border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, overflow: 'hidden' }}>
                {plannedList.map((it, idx) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 90px 140px 160px 1fr 110px',
                      gap: 10,
                      padding: '10px 12px',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ opacity: 0.85 }}>{it.planned_date}</div>
                    <div style={{ fontWeight: 800, opacity: 0.9 }}>{it.flow_type}</div>
                    <div style={{ fontWeight: 800 }}>{yen(Number(it.amount))}</div>
                    <div style={{ opacity: 0.7 }}>
                      {it.cash_account_id ? `acct: ${it.cash_account_id}` : '(No account)'}
                    </div>
                    <div style={{ opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.memo ?? ''}
                    </div>

                    <button
                      onClick={() => onDeletePlanned(it.id)}
                      disabled={plannedDeletingId === it.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: 'rgba(239,68,68,0.18)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 800,
                      }}
                      title="削除"
                    >
                      {plannedDeletingId === it.id ? '...' : 'Delete'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Debug */}
        <div
          style={{
            marginTop: 18,
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Debug</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 8 }}>APIレスポンスの生データ（必要なら消してOK）</div>
          <pre style={{ margin: 0, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,0.6)', overflowX: 'auto' }}>
            {JSON.stringify(overview, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Card(props: { title: string; value: string; subtitle: string }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: 16,
        background: 'rgba(0,0,0,0.35)',
        minHeight: 86,
      }}
    >
      <div style={{ opacity: 0.75, fontSize: 12, fontWeight: 700 }}>{props.title}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>{props.value}</div>
      <div style={{ marginTop: 6, opacity: 0.6, fontSize: 12 }}>{props.subtitle}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.16)',
  background: 'rgba(0,0,0,0.5)',
  color: '#fff',
};