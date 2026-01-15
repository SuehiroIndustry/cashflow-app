"use client";

import { useEffect, useState } from "react";
import {
  getDashboardOverview,
  type DashboardOverviewRow,
} from "@/lib/dashboard/getDashboardOverview";

export type Account = {
  id: number;
  name: string;
};

type Props = {
  accounts: Account[];
};

export default function DashboardClient({ accounts }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null // null = All（全口座合算）
  );
  const [overview, setOverview] = useState<DashboardOverviewRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDashboardOverview({ accountId: selectedAccountId })
      .then((data) => setOverview(data))
      .finally(() => setLoading(false));
  }, [selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* 口座フィルタ */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedAccountId(null)}
          className={`px-3 py-1 rounded ${
            selectedAccountId === null ? "bg-white text-black" : "border"
          }`}
        >
          All
        </button>

        {accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelectedAccountId(a.id)}
            className={`px-3 py-1 rounded ${
              selectedAccountId === a.id ? "bg-white text-black" : "border"
            }`}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Overview */}
      {loading || !overview ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card title="現在残高" value={overview.current_balance} />
          <Card title="今月の収入" value={overview.income_mtd} />
          <Card title="今月の支出" value={overview.expense_mtd} />
          <Card title="30日収入予定" value={overview.planned_income_30d} />
          <Card title="30日支出予定" value={overview.planned_expense_30d} />
          <Card title="30日後残高" value={overview.projected_balance_30d} />

          <div className="col-span-3 border p-4 rounded">
            <div className="text-sm text-gray-400">Risk</div>
            <div className="text-xl font-bold">{overview.risk_level}</div>
            <div className="text-xs">score: {overview.risk_score}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded p-4">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="text-xl font-bold">
        ¥{value.toLocaleString()}
      </div>
    </div>
  );
}