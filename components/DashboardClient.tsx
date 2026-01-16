'use client';

import { useEffect, useMemo, useState } from 'react';

type Account = {
  id: number;
  name: string;
};

type OverviewResponse = {
  current_balance?: number | null;
  month_income?: number | null;
  month_expense?: number | null;

  // plain
  planned_income?: number | null;
  planned_expense?: number | null;
  projected_balance?: number | null;

  // 30d
  planned_income_30d?: number | null;
  planned_expense_30d?: number | null;
  projected_balance_30d?: number | null;

  risk_level?: string | null;
  risk_score?: number | null;
  computed_at?: string | null;

  error?: string;
};

type Props = {
  initialAccounts: Account[];
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function yen(v: unknown): string {
  const x = n(v);
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(x);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '-';
  return new Date(t).toLocaleString('ja-JP');
}

function riskBadge(level: string) {
  const upper = (level || 'UNKNOWN').toUpperCase();
  if (upper === 'GREEN') return { label: 'GREEN', cls: 'bg-green-600/20 text-green-200 border-green-500/40' };
  if (upper === 'YELLOW') return { label: 'YELLOW', cls: 'bg-yellow-600/20 text-yellow-100 border-yellow-500/40' };
  if (upper === 'RED') return { label: 'RED', cls: 'bg-red-600/20 text-red-100 border-red-500/40' };
  return { label: upper, cls: 'bg-slate-600/20 text-slate-200 border-slate-500/40' };
}

export default function DashboardClient({ initialAccounts }: Props) {
  const [accountId, setAccountId] = useState<'all' | number>('all');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<OverviewResponse | null>(null);

  const accounts = useMemo(() => initialAccounts ?? [], [initialAccounts]);

  async function fetchOverview(nextAccountId: 'all' | number) {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (nextAccountId !== 'all') qs.set('cash_account_id', String(nextAccountId));
      const url = `/api/overview${qs.toString() ? `?${qs.toString()}` : ''}`;

      const res = await fetch(url, { cache: 'no-store' });
      const json = (await res.json()) as OverviewResponse;

      if (!res.ok) {
        throw new Error(json?.error || `API error: ${res.status}`);
      }
      if (json?.error) {
        throw new Error(json.error);
      }

      setData(json);
    } catch (e: any) {
      setData(null);
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  // 初回ロード
  useEffect(() => {
    fetchOverview(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // planned / projected は plain or 30d どっちでも拾う（APIがどっち返してもOK）
  const plannedIncome = useMemo(() => {
    if (!data) return 0;
    return data.planned_income ?? data.planned_income_30d ?? 0;
  }, [data]);

  const plannedExpense = useMemo(() => {
    if (!data) return 0;
    return data.planned_expense ?? data.planned_expense_30d ?? 0;
  }, [data]);

  const projectedBalance = useMemo(() => {
    if (!data) return 0;
    return data.projected_balance ?? data.projected_balance_30d ?? 0;
  }, [data]);

  const risk = useMemo(() => {
    const level = (data?.risk_level ?? 'UNKNOWN').toString();
    const score = n(data?.risk_score);
    return { level, score, ...riskBadge(level) };
  }, [data]);

  const currentBalance = n(data?.current_balance);
  const monthIncome = n(data?.month_income);
  const monthExpense = n(data?.month_expense);

  const netMonth = monthIncome - monthExpense;
  const netPlanned = n(plannedIncome) - n(plannedExpense);

  const headline = useMemo(() => {
    // ざっくり「状態が良いかどうか」だけ色で返す
    const ok = projectedBalance >= 0 && risk.level.toUpperCase() !== 'RED';
    return ok
      ? { title: 'Cashflow Dashboard', sub: '今日の状態は落ち着いてる。次は“攻め”を入れよう。', cls: 'border-emerald-500/30' }
      : { title: 'Cashflow Dashboard', sub: '危険信号あり。まずは出血点の特定。', cls: 'border-rose-500/30' };
  }, [projectedBalance, risk.level]);

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className={`rounded-xl border ${headline.cls} bg-slate-950/40 p-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{headline.title}</h1>
              <p className="mt-2 text-sm text-slate-300">{headline.sub}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${risk.cls}`}>
                <span className="font-semibold">RISK</span>
                <span>{risk.label}</span>
                <span className="opacity-80">(score: {risk.score})</span>
              </div>

              <button
                onClick={() => fetchOverview(accountId)}
                disabled={loading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">computed_at: {fmtDate(data?.computed_at)}</div>

          {err && (
            <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200">
              <div className="font-semibold">Dashboard Error</div>
              <div className="mt-1 whitespace-pre-wrap break-words">{err}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Accounts</div>
              <div className="mt-1 text-xs text-slate-400">口座を絞ってOverviewを確認できる</div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={accountId === 'all' ? 'all' : String(accountId)}
                onChange={(e) => {
                  const v = e.target.value;
                  const next: 'all' | number = v === 'all' ? 'all' : Number(v);
                  setAccountId(next);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              >
                <option value="all">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} {a.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => fetchOverview(accountId)}
                disabled={loading}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            現在のデータキーは plain / 30d どちらでも受ける（planned_income と planned_income_30d を両対応）。
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard title="Current Balance" value={yen(currentBalance)} hint="全口座合算 or 絞り込み結果" />
          <MetricCard title="This Month" value={`${yen(monthIncome)} / ${yen(monthExpense)}`} hint="income / expense" />
          <MetricCard title="Net (Month)" value={yen(netMonth)} hint="income - expense" />

          <MetricCard title="Planned (30d)" value={`${yen(plannedIncome)} / ${yen(plannedExpense)}`} hint="planned income / planned expense" />
          <MetricCard title="Net (Planned)" value={yen(netPlanned)} hint="planned income - planned expense" />
          <MetricCard title="Projected Balance" value={yen(projectedBalance)} hint="現状 + 予定反映の見込み" />
        </div>

        {/* Raw (debug) */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Debug</div>
              <div className="mt-1 text-xs text-slate-400">APIレスポンスの生データ（必要なら消してOK）</div>
            </div>
          </div>

          <pre className="mt-4 overflow-auto rounded-lg border border-slate-800 bg-black/60 p-4 text-xs text-slate-200">
{JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

function MetricCard(props: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="text-xs font-semibold text-slate-300">{props.title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{props.value}</div>
      {props.hint ? <div className="mt-2 text-xs text-slate-400">{props.hint}</div> : null}
    </div>
  );
}