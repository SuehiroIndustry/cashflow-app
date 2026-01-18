// app/dashboard/_components/OverviewCard.tsx
import React from "react";
import type { OverviewPayload } from "../_types";

export default function OverviewCard(props: {
  accountName: string;
  payload: OverviewPayload;
}) {
  const { accountName, payload } = props;

  const yen = (n: number) => `¥${Number.isFinite(n) ? n.toLocaleString() : "0"}`;

  return (
    <div className="space-y-1">
      <div className="font-semibold">Overview</div>

      <div>Account: {accountName}</div>

      <div>Current Balance: {yen(payload.currentBalance)}</div>
      <div>This Month Income: {yen(payload.thisMonthIncome)}</div>
      <div>This Month Expense: {yen(payload.thisMonthExpense)}</div>
      <div>Net: {yen(payload.net)}</div>

      <div className="mt-2">
        <div>月次残高</div>
        <div>{yen(payload.monthlyBalance)}</div>
        <div>前月比: {yen(payload.monthlyDiff)}</div>
      </div>
    </div>
  );
}