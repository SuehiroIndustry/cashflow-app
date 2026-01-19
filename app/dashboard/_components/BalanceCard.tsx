// app/dashboard/_components/BalanceCard.tsx
"use client";

import React from "react";
import type { MonthlyCashBalanceRow } from "../_types";

type Props = {
  rows: MonthlyCashBalanceRow[];
};

export default function BalanceCard({ rows }: Props) {
  // rows が空なら何も出さない（DashboardClient 側でもガードしてるが保険）
  if (!rows || rows.length === 0) return null;

  const latest = rows[rows.length - 1];
  const income = latest?.income ?? 0;
  const expense = latest?.expense ?? 0;
  const balance = latest?.balance ?? 0;

  return (
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>月次サマリ</div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ opacity: 0.8 }}>Income</div>
          <div>¥{income.toLocaleString()}</div>
        </div>

        <div>
          <div style={{ opacity: 0.8 }}>Expense</div>
          <div>¥{expense.toLocaleString()}</div>
        </div>

        <div>
          <div style={{ opacity: 0.8 }}>Balance</div>
          <div>¥{balance.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}