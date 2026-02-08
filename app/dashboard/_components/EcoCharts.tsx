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
      <div className="border border-white/15 bg-white/5 rounded p-4">
        <div className="font-semibold mb-2 text-white">推移（サマリ）</div>
        {latest ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/70">最新月</div>
              <div className="font-semibold text-white">{latest.month}</div>
            </div>
            <div>
              <div className="text-white/70">収入</div>
              <div className="font-semibold text-white">{yen(latest.income)}</div>
            </div>
            <div>
              <div className="text-white/70">支出</div>
              <div className="font-semibold text-white">{yen(latest.expense)}</div>
            </div>
            <div>
              <div className="text-white/70">残高</div>
              <div className="font-semibold text-white">{yen(latest.balance)}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">No data</div>
        )}
      </div>

      {/* “Charts” (simple list) */}
      <div className="border border-white/15 bg-white/5 rounded p-4">
        <div className="font-semibold mb-3 text-white">月次（一覧）</div>

        <div className="space-y-2">
          {rows.map((r) => {
            const neg = r.balance < 0;
            return (
              <div key={r.month} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{r.month}</span>
                <span className="flex gap-3">
                  <span className="tabular-nums text-white">{yen(r.income)}</span>
                  <span className="tabular-nums text-white/70">{yen(r.expense)}</span>
                  <span className={neg ? "tabular-nums font-semibold text-red-400" : "tabular-nums font-semibold text-white"}>
                    {yen(r.balance)}
                  </span>
                </span>
              </div>
            );
          })}

          {!rows.length && <div className="text-sm text-white/60">No rows</div>}
        </div>
      </div>
    </div>
  );
}