// app/dashboard/_components/EcoCharts.tsx
import React from "react";
import type { MonthlyBalanceRow } from "../_types";

type Props = {
  rows: MonthlyBalanceRow[];
};

/**
 * シンプルな月次サマリー表示（チャートは後で差し替えOK）
 * 今は「型エラーを出さない・責務を守る」ことを最優先
 */
export default function EcoCharts({ rows }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="text-sm font-semibold">月次サマリー</h3>

      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={`${r.cash_account_id}-${r.month}`}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-muted-foreground">
              {r.month}
            </span>

            <span
              className={
                r.balance >= 0
                  ? "font-medium text-emerald-600"
                  : "font-medium text-red-600"
              }
            >
              {r.balance.toLocaleString()} 円
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}