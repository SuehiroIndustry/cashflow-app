// app/dashboard/_components/EcoCharts.tsx
"use client";

import React from "react";
import type { MonthlyCashBalanceRow } from "../_types";

type Props = {
  rows: MonthlyCashBalanceRow[];
};

export default function EcoCharts({ rows }: Props) {
  // ここでは簡易表示だけ。後でグラフに差し替え可能
  if (!rows || rows.length === 0) return null;

  return (
    <div style={{ marginTop: 12, border: "1px solid #333", padding: 12, borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>last {rows.length} months</div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 8px" }}>Month</th>
            <th style={{ textAlign: "right", padding: "4px 8px" }}>Income</th>
            <th style={{ textAlign: "right", padding: "4px 8px" }}>Expense</th>
            <th style={{ textAlign: "right", padding: "4px 8px" }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.cash_account_id}-${r.month}`}>
              <td style={{ padding: "4px 8px" }}>{r.month}</td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                ¥{(r.income ?? 0).toLocaleString()}
              </td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                ¥{(r.expense ?? 0).toLocaleString()}
              </td>
              <td style={{ textAlign: "right", padding: "4px 8px" }}>
                ¥{(r.balance ?? 0).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}