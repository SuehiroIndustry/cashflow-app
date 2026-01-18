// app/dashboard/_components/OverviewCard.tsx
import React from "react";
import type { OverviewPayload } from "../_types";

function yen(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `¥${Math.trunc(v).toLocaleString()}`;
}

type Props = {
  accountName: string;
  accountId: number;
  overview: OverviewPayload;
};

export default function OverviewCard({ accountName, accountId, overview }: Props) {
  return (
    <div className="space-y-2">
      <div className="text-sm opacity-80">Overview</div>

      <div className="text-sm">
        <div>Account: {accountName} / id: {accountId}</div>
      </div>

      <div className="text-sm space-y-1">
        <div>Current Balance: {yen(overview.currentBalance)}</div>
        <div>This Month Income: {yen(overview.thisMonthIncome)}</div>
        <div>This Month Expense: {yen(overview.thisMonthExpense)}</div>
        <div>Net: {yen(overview.net)}</div>
      </div>

      <div className="pt-2 text-sm space-y-1">
        <div className="opacity-80">月次残高</div>
        <div>{yen(overview.monthBalance)}</div>
        <div className="opacity-80">前月比: {yen(overview.prevMonthDiff)}</div>
      </div>
    </div>
  );
}