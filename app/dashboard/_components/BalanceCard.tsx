import React from "react";
import type { MonthlyBalanceRow } from "../_types";

type Props = {
  rows: MonthlyBalanceRow[];
};

export default function BalanceCard({ rows }: Props) {
  return (
    <div className="rounded-xl border p-4 space-y-2">
      <h3 className="text-sm font-semibold">月次残高</h3>
      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={`${r.cash_account_id}-${r.month}`} className="flex justify-between">
            <span>{r.month}</span>
            <span>{r.balance.toLocaleString()} 円</span>
          </li>
        ))}
      </ul>
    </div>
  );
}