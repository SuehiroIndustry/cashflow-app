'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

type MonthlyRow = {
  month: string; // 'YYYY-MM-01'
  in_sum: number | null;
  out_sum: number | null;
  net: number | null;
};

type TopOutRow = {
  month: string; // current month
  category: string;
  out_sum: number | null;
};

function yen(n: number) {
  // ざっくり見やすく（経営者は細かい端数より意思決定）
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(n);
}

function ymLabel(dateStr: string) {
  // '2024-03-01' -> '2024/03'
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}/${m}`;
}

function safeNum(v: number | null | undefined) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export default function CeoDashboardPage() {
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [current, setCurrent] = useState<MonthlyRow | null>(null);
  const [series, setSeries] = useState<MonthlyRow[]>([]);
  const [topOut, setTopOut] = useState<TopOutRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr(null);

      // 1) ログインしてる前提（経営者画面）
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (!mounted) return;
      if (userErr) {
        setErr(userErr.message);
        setLoading(false);
        return;
      }
      if (!user) {
        setErr('ログインが必要です（auth.uid() が取れません）');
        setLoading(false);
        return;
      }

      // 2) 今月サマリー（ビュー：v_cash_monthly_summary_current）
      const curRes = await supabase
        .from('v_cash_monthly_summary_current')
        .select('month,in_sum,out_sum,net')
        .eq('user_id', user.id)
        .order('month', { ascending: false })
        .limit(1);

      // 3) 24ヶ月シリーズ（ビュー：v_cash_monthly_summary_24m）
      const seriesRes = await supabase
        .from('v_cash_monthly_summary_24m')
        .select('month,in_sum,out_sum,net')
        .eq('user_id', user.id)
        .order('month', { ascending: true });

      // 4) 今月の支出トップ10（ビュー：v_cash_monthly_out_by_category_current）
      const topRes = await supabase
        .from('v_cash_monthly_out_by_category_current')
        .select('month,category,out_sum')
        .eq('user_id', user.id)
        .order('out_sum', { ascending: false })
        .limit(10);

      if (!mounted) return;

      const e = curRes.error || seriesRes.error || topRes.error;
      if (e) {
        setErr(e.message);
        setLoading(false);
        return;
      }

      const cur = (curRes.data?.[0] ?? null) as MonthlyRow | null;
      const ser = (seriesRes.data ?? []) as MonthlyRow[];
      const top = (topRes.data ?? []) as TopOutRow[];

      setCurrent(cur);
      setSeries(ser);
      setTopOut(top);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const chartData = useMemo(() => {
    return series.map((r) => ({
      month: ymLabel(r.month),
      in_sum: safeNum(r.in_sum),
      out_sum: safeNum(r.out_sum),
      net: safeNum(r.net),
    }));
  }, [series]);

  const kpis = useMemo(() => {
    const curIn = safeNum(current?.in_sum);
    const curOut = safeNum(current?.out_sum);
    const curNet = safeNum(current?.net);

    const last = series.length >= 2 ? series[series.length - 2] : null;
    const lastNet = safeNum(last?.net);
    const momNet = curNet - lastNet;

    // 直近3ヶ月の平均（ネット）
    const last3 = series.slice(-3);
    const avg3 =
      last3.length === 0
        ? 0
        : last3.reduce((acc, r) => acc + safeNum(r.net), 0) / last3.length;

    return {
      curIn,
      curOut,
      curNet,
      momNet,
      avg3,
    };
  }, [current, series]);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>
        <p style={{ opacity: 0.8 }}>読み込み中…（数字は逃げません）</p>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>
        <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12 }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>エラー</p>
          <p style={{ opacity: 0.9 }}>{err}</p>
          <p style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
            典型原因：ビューのRLS/権限、またはビュー名ミス（public.v_cash_monthly_summary_24m など）
          </p>
        </div>
      </div>
    );
  }

  const currentMonthLabel = current?.month ? ymLabel(current.month) : '—';

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>
          <p style={{ opacity: 0.8, marginTop: 4 }}>対象：{currentMonthLabel}（実績 / is_projection=false）</p>
        </div>
      </header>

      {/* KPI cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <Card title="入金" value={yen(kpis.curIn)} sub="当月" />
        <Card title="出金" value={yen(kpis.curOut)} sub="当月" />
        <Card title="ネット" value={yen(kpis.curNet)} sub="当月（入金-出金）" />
        <Card
          title="ネット前年差"
          value={yen(kpis.momNet)}
          sub="前月比（ネット）"
          emphasis={kpis.momNet < 0 ? 'bad' : 'good'}
        />
      </section>

      {/* Chart */}
      <section style={{ padding: 16, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>24ヶ月トレンド</h2>
          <p style={{ opacity: 0.8, fontSize: 12 }}>直近3ヶ月平均ネット：{yen(kpis.avg3)}</p>
        </div>

        <div style={{ width: '100%', height: 320, marginTop: 12 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any, name) => {
                  const n = typeof value === 'number' ? value : 0;
                  const label = name === 'in_sum' ? '入金' : name === 'out_sum' ? '出金' : 'ネット';
                  return [yen(n), label];
                }}
              />
              <Legend
                formatter={(value) => (value === 'in_sum' ? '入金' : value === 'out_sum' ? '出金' : 'ネット')}
              />
              <Line type="monotone" dataKey="in_sum" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="out_sum" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="net" dot={false} strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top out categories */}
      <section style={{ padding: 16, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>当月の支出トップ（カテゴリ）</h2>
        {topOut.length === 0 ? (
          <p style={{ opacity: 0.8, marginTop: 8 }}>データがありません。</p>
        ) : (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', opacity: 0.85 }}>
                  <th style={{ padding: '10px 8px' }}>カテゴリ</th>
                  <th style={{ padding: '10px 8px' }}>金額</th>
                </tr>
              </thead>
              <tbody>
                {topOut.map((r, i) => (
                  <tr key={`${r.category}-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                    <td style={{ padding: '10px 8px' }}>{r.category}</td>
                    <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>
                      {yen(safeNum(r.out_sum))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Next step hint */}
      <section style={{ opacity: 0.85, fontSize: 12, lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>
          次の伸びしろ：①「口座別（cash_account）」の推移、②「固定費/変動費」タグ、③ 予測（is_projection=true）を重ねて意思決定にする。
        </p>
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  emphasis,
}: {
  title: string;
  value: string;
  sub?: string;
  emphasis?: 'good' | 'bad';
}) {
  const border =
    emphasis === 'good'
      ? '1px solid rgba(0,255,180,0.25)'
      : emphasis === 'bad'
      ? '1px solid rgba(255,120,120,0.25)'
      : '1px solid rgba(255,255,255,0.15)';

  return (
    <div style={{ padding: 14, border, borderRadius: 16 }}>
      <div style={{ opacity: 0.8, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub ? <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}