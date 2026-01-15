'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DashboardOverview = {
  cash_account_id: number;
  cash_account_name: string;
  balance: number;
  month_income: number;
  month_expense: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  risk_level: 'green' | 'yellow' | 'red';
  computed_at: string;
};

export default function DashboardClient() {
  const [data, setData] = useState<DashboardOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('v_dashboard_overview_user_v2')
        .select('*')
        .order('cash_account_id');

      if (error) {
        console.error(error);
        setError('データ取得に失敗しました');
        setLoading(false);
        return;
      }

      setData(data ?? []);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {data.map((row) => (
        <div
          key={row.cash_account_id}
          className="rounded-xl border p-6 shadow-sm"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">
              {row.cash_account_name}
            </h2>
            <span className="font-bold">
              {row.risk_level.toUpperCase()}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="現在残高" value={row.balance} />
            <Metric label="今月収入" value={row.month_income} />
            <Metric label="今月支出" value={row.month_expense} />
            <Metric label="30日予定収入" value={row.planned_income_30d} />
            <Metric label="30日予定支出" value={row.planned_expense_30d} />
          </div>

          <div className="mt-2 text-xs text-gray-400">
            更新: {new Date(row.computed_at).toLocaleString('ja-JP')}
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-gray-50 p-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-xl font-bold">
        ¥{value.toLocaleString()}
      </div>
    </div>
  );
}