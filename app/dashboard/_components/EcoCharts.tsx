// app/dashboard/_components/EcoCharts.tsx
"use client";

import React, { useMemo } from "react";
import type { MonthlyCashBalanceRow } from "../_types";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function EcoCharts(props: {
  rows: MonthlyCashBalanceRow[];
}) {
  const chartData = useMemo(() => {
    return (props.rows ?? []).map((r) => ({
      month: r.month?.slice(0, 7), // "YYYY-MM"
      income: r.income ?? 0,
      expense: r.expense ?? 0,
      balance: r.balance ?? 0,
    }));
  }, [props.rows]);

  if (!chartData.length) {
    return (
      <div style={{ opacity: 0.7 }}>
        データがありません（RLS / データ未作成の可能性）
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="income" />
          <Bar dataKey="expense" />
          <Line type="monotone" dataKey="balance" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}