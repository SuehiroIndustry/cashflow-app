// app/dashboard/_components/EcoCharts.tsx
"use client";

import React, { useMemo } from "react";
import type { MonthlyBalanceRow } from "../_types";

// recharts 使ってる前提（すでに導入済みっぽいので）
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

type Props = {
  accountName: string;
  monthly: MonthlyBalanceRow[];
  yen: (n: number) => string;
};

export default function EcoCharts({ accountName, monthly, yen }: Props) {
  const data = useMemo(() => {
    return (monthly ?? []).map((r) => ({
      month: r.month,
      balance: r.balance ?? 0,
      income: r.income ?? 0,
      expense: r.expense ?? 0,
    }));
  }, [monthly]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-base font-semibold">Charts</div>
        <div className="text-xs text-gray-500">last {data.length} months</div>
      </div>

      <div className="text-xs text-gray-400 mb-2">{accountName}</div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => yen(Number(v)).replace("￥", "¥")} />
            <Tooltip
              formatter={(value: any, name: any) => [yen(Number(value)), name]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="balance" dot />
            <Line type="monotone" dataKey="expense" dot={false} />
            <Line type="monotone" dataKey="income" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        ※ Income/Expense は月次、Balance は月末残高（想定）
      </div>
    </div>
  );
}