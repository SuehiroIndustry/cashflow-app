// app/dashboard/_components/BalanceCard.tsx
"use client";

import React from "react";
import type { MonthlyBalanceRow } from "../_types";

export default function BalanceCard(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  return (
    <div className="border rounded p-4">
      <div className="font-semibold mb-2">残高推移</div>

      <ul className="space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.month} className="flex justify-between">
            <span>{r.month}</span>
            <span>{r.balance.toLocaleString()} 円</span>
          </li>
        ))}

        {!rows.length && <li className="opacity-60">No data</li>}
      </ul>
    </div>
  );
}