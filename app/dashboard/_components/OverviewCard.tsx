// app/dashboard/_components/OverviewCard.tsx
import React from "react";
import type { OverviewPayload } from "../_types";

type Props = {
  payload: OverviewPayload | null | undefined;
};

function yen(value: unknown): string {
  const n =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return n.toLocaleString("ja-JP") + " 円";
}

export default function OverviewCard({ payload }: Props) {
  // payload が {} / null / undefined でも落ちない
  const p = (payload ?? {}) as Partial<OverviewPayload>;

  const accountName = typeof p.accountName === "string" ? p.accountName : "-";
  const currentBalance = p.currentBalance;
  const thisMonthIncome = p.thisMonthIncome;
  const thisMonthExpense = p.thisMonthExpense;
  const net = typeof p.net === "number" && Number.isFinite(p.net) ? p.net : 0;

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <h3 className="text-sm font-semibold">Overview</h3>

      <div className="text-sm">Account: {accountName}</div>

      <div className="text-sm">
        Current Balance: <span className="font-medium">{yen(currentBalance)}</span>
      </div>

      <div className="text-sm">This Month Income: {yen(thisMonthIncome)}</div>
      <div className="text-sm">This Month Expense: {yen(thisMonthExpense)}</div>

      <div
        className={
          net >= 0
            ? "text-sm font-medium text-emerald-600"
            : "text-sm font-medium text-red-600"
        }
      >
        Net: {yen(net)}
      </div>
    </div>
  );
}