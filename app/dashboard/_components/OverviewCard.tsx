// app/dashboard/_components/OverviewCard.tsx
import React from "react";

type OverviewPayload = {
  currentBalance: number;
  monthIncome: number;
  monthExpense: number;
  net: number;
};

function yen(n: number) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return `¥${v.toLocaleString()}`;
}

export default function OverviewCard(props: {
  accountName: string;
  payload: OverviewPayload;
}) {
  const { accountName, payload } = props;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-sm font-semibold text-white/80">Overview</h2>
      <div className="mt-1 text-xs text-white/50">{accountName}</div>

      <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
        <div className="text-white/60">Current Balance</div>
        <div className="text-right">{yen(payload.currentBalance)}</div>

        <div className="text-white/60">This Month Income</div>
        <div className="text-right">{yen(payload.monthIncome)}</div>

        <div className="text-white/60">This Month Expense</div>
        <div className="text-right">{yen(payload.monthExpense)}</div>

        <div className="text-white/60">Net</div>
        <div className="text-right">{yen(payload.net)}</div>
      </div>
    </div>
  );
}