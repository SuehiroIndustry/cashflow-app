import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';

type MonthlyRow = {
  month: string;
  in_sum: number | null;
  out_sum: number | null;
  net: number | null;
};

type TopOutRow = {
  month: string;
  category: string;
  out_sum: number | null;
};

function yen(n: number) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(n);
}

function ymLabel(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}/${m}`;
}

function safeNum(v: number | null | undefined) {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export default async function CeoDashboardPage() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server Componentでは set は基本不要（ログイン処理は別箇所でやる）
        },
      },
    }
  );

  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) redirect('/login');

  // 今月サマリー
  const curRes = await supabase
    .from('v_cash_monthly_summary_current')
    .select('month,in_sum,out_sum,net')
    .eq('user_id', user.id)
    .order('month', { ascending: false })
    .limit(1);

  // 24ヶ月
  const seriesRes = await supabase
    .from('v_cash_monthly_summary_24m')
    .select('month,in_sum,out_sum,net')
    .eq('user_id', user.id)
    .order('month', { ascending: true });

  // 今月カテゴリ別トップ10支出
  const topRes = await supabase
    .from('v_cash_monthly_out_by_category_current')
    .select('month,category,out_sum')
    .eq('user_id', user.id)
    .order('out_sum', { ascending: false })
    .limit(10);

  const e = curRes.error || seriesRes.error || topRes.error;
  if (e) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>
        <div style={{ marginTop: 12, padding: 12, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12 }}>
          <p style={{ fontWeight: 700, marginBottom: 6 }}>エラー</p>
          <p style={{ opacity: 0.9 }}>{e.message}</p>
          <p style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
            典型原因：ビューのRLS/権限、またはビュー名ミス（v_cash_monthly_summary_24m など）
          </p>
        </div>
      </div>
    );
  }

  const current = (curRes.data?.[0] ?? null) as MonthlyRow | null;
  const series = (seriesRes.data ?? []) as MonthlyRow[];
  const topOut = (topRes.data ?? []) as TopOutRow[];

  const curIn = safeNum(current?.in_sum);
  const curOut = safeNum(current?.out_sum);
  const curNet = safeNum(current?.net);

  const last = series.length >= 2 ? series[series.length - 2] : null;
  const momNet = curNet - safeNum(last?.net);

  const last3 = series.slice(-3);
  const avg3 = last3.length ? last3.reduce((a, r) => a + safeNum(r.net), 0) / last3.length : 0;

  const currentMonthLabel = current?.month ? ymLabel(current.month) : '—';

  return (
    <div style={{ padding: 24, display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>経営者ダッシュボード</h1>
          <p style={{ opacity: 0.8, marginTop: 4 }}>対象：{currentMonthLabel}（実績 / is_projection=false）</p>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <Card title="入金" value={yen(curIn)} sub="当月" />
        <Card title="出金" value={yen(curOut)} sub="当月" />
        <Card title="ネット" value={yen(curNet)} sub="当月（入金-出金）" />
        <Card title="ネット前年差" value={yen(momNet)} sub="前月比（ネット）" emphasis={momNet < 0 ? 'bad' : 'good'} />
      </section>

      <section style={{ padding: 16, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>直近の推移（テーブル）</h2>
        <p style={{ opacity: 0.8, fontSize: 12, marginTop: 6 }}>直近3ヶ月平均ネット：{yen(avg3)}</p>

        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.85 }}>
                <th style={{ padding: '10px 8px' }}>月</th>
                <th style={{ padding: '10px 8px' }}>入金</th>
                <th style={{ padding: '10px 8px' }}>出金</th>
                <th style={{ padding: '10px 8px' }}>ネット</th>
              </tr>
            </thead>
            <tbody>
              {series.slice(-24).reverse().map((r, i) => (
                <tr key={`${r.month}-${i}`} style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  <td style={{ padding: '10px 8px' }}>{ymLabel(r.month)}</td>
                  <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>{yen(safeNum(r.in_sum))}</td>
                  <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>{yen(safeNum(r.out_sum))}</td>
                  <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>{yen(safeNum(r.net))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                    <td style={{ padding: '10px 8px', fontVariantNumeric: 'tabular-nums' }}>{yen(safeNum(r.out_sum))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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