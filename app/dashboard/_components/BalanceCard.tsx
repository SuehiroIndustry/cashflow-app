"use client";

import * as React from "react";

export type MonthlyBalanceRow = {
  month: string;          // 'YYYY-MM-01' みたいなISO想定
  balance: number;        // 月末残高
};

type Props = {
  accountName: string;
  monthly: MonthlyBalanceRow[];
  yen: (n: number) => string;
};

function toMonthLabel(iso: string): string {
  // '2026-01-01' -> '2026-01'
  if (!iso) return "";
  return iso.slice(0, 7);
}

export default function BalanceCard({ accountName, monthly, yen }: Props) {
  const latest = monthly?.length ? monthly[monthly.length - 1] : null;
  const prev =
    monthly && monthly.length >= 2 ? monthly[monthly.length - 2] : null;

  const latestBalance = latest?.balance ?? 0;
  const prevBalance = prev?.balance ?? 0;
  const delta = latestBalance - prevBalance;

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-muted-foreground">月次残高（{accountName}）</div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold">{yen(latestBalance)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {latest ? `${toMonthLabel(latest.month)} 時点` : "データなし"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">前月比</div>
          <div className="text-sm font-medium">
            {yen(delta)}
          </div>
        </div>
      </div>

      {/* ざっくり履歴（必要なら後でグラフに差し替え） */}
      <div className="mt-4 space-y-1">
        {monthly?.slice(-6).map((r) => (
          <div key={r.month} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{toMonthLabel(r.month)}</span>
            <span>{yen(r.balance)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}