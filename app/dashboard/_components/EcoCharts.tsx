// app/dashboard/_components/EcoCharts.tsx
"use client";

import React, { useMemo } from "react";
import type { MonthlyBalanceRow } from "../_types";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function EcoCharts(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  const latest = useMemo(() => {
    if (!rows.length) return null;
    return rows[rows.length - 1];
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-2">推移（サマリ）</div>
        {latest ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="opacity-70">最新月</div>
              <div className="font-semibold">{latest.month}</div>
            </div>
            <div>
              <div className="opacity-70">収入</div>
              <div className="font-semibold">{yen(latest.income)}</div>
            </div>
            <div>
              <div className="opacity-70">支出</div>
              <div className="font-semibold">{yen(latest.expense)}</div>
            </div>
            <div>
              <div className="opacity-70">残高</div>
              <div className="font-semibold">{yen(latest.balance)}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-60">No data</div>
        )}
      </div>

      {/* “Charts” (simple list until you plug real charts) */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-3">月次（一覧）</div>

        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.month} className="flex items-center justify-between text-sm">
              <span className="opacity-70">{r.month}</span>
              <span className="flex gap-3">
                <span className="tabular-nums">{yen(r.income)}</span>
                <span className="tabular-nums opacity-70">{yen(r.expense)}</span>
                <span className="tabular-nums font-semibold">{yen(r.balance)}</span>
              </span>
            </div>
          ))}

          {!rows.length && <div className="text-sm opacity-60">No rows</div>}
        </div>
      </div>
    </div>
  );
}