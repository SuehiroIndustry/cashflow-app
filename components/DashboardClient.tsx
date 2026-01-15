'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type DashboardOverview = {
  cash_account_id: number;
  cash_account_name: string;
  balance: number;

  month_income: number;
  month_expense: number;

  planned_income_30d: number;
  planned_expense_30d: number;

  risk_level: 'low' | 'medium' | 'high';
  computed_at: string;
};

export default function DashboardClient() {
  const supabase = createClientComponentClient();
  const [data, setData] = useState<DashboardOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('v_dashboard_overview_user_v2')
        .select('*')
        .order('cash_account_id');

      if (error) {
        console.error(error);
        setError('データの取得に失敗しました');
        setLoading(false);
        return;
      }

      setData(data ?? []);
      setLoading(false);
    };

    fetchDashboard();
  }, [supabase]);

  if (loading) {
    return <div className="p-4 text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {data.map((row) => (
        <div
          key={row.cash_account_id}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {row.cash_account_name}
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                row.risk_level === 'low'
                  ? 'bg-green-100 text-green-700'
                  : row.risk_level === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              リスク：{row.risk_level}
            </span>
          </div> 

          <div className="mt-4 grid grid-cols-2 gap-4">
            <Metric label="現在残高" value={row.balance} />
            <Metric label="今月収入" value={row.month_income} />
            <Metric label="今月支出" value={row.month_expense} />
            <Metric label="30日以内予定収入" value={row.planned_income_30d} />
            <Metric label="30日以内予定支出" value={row.planned_expense_30d} />
          </div>

          <div className="mt-4 text-xs text-gray-400">
            集計時刻：{new Date(row.computed_at).toLocaleString('ja-JP')}
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold">
        ¥{value.toLocaleString()}
      </div>
    </div>
  );
}