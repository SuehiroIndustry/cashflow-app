"use client";

import React from "react";
import type { CashFlowRow } from "./_actions/getRecentCashFlows";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function TransactionsTable({ initialRows }: { initialRows: CashFlowRow[] }) {
  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="font-semibold">直近の取引</div>
          <div className="text-xs opacity-60">最新30件（口座フィルタは次で付ける）</div>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="opacity-70">
            <tr className="text-left border-b border-neutral-800">
              <th className="py-2">日付</th>
              <th className="py-2">区分</th>
              <th className="py-2 text-right">金額</th>
              <th className="py-2">カテゴリ</th>
              <th className="py-2">メモ</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-800 last:border-b-0">
                <td className="py-2">{r.date}</td>
                <td className="py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs border ${
                      r.section === "in"
                        ? "border-emerald-500/50 text-emerald-200"
                        : "border-red-500/50 text-red-200"
                    }`}
                  >
                    {r.section === "in" ? "収入" : "支出"}
                  </span>
                </td>
                <td className="py-2 text-right">{yen(r.amount)}</td>
                <td className="py-2">{r.cash_category_name ?? `id:${r.cash_category_id}`}</td>
                <td className="py-2">{r.description ?? ""}</td>
              </tr>
            ))}
            {!initialRows.length && (
              <tr>
                <td colSpan={5} className="py-6 text-center opacity-60">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}