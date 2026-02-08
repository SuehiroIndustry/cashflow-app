// app/dashboard/DashboardClient.tsx
"use client";

import type { ReactNode } from "react";
import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  accounts: AccountRow[];
  monthly: MonthlyBalanceRow[];
  children?: ReactNode;
};

export default function DashboardClient(props: Props) {
  const { children, accounts, monthly, alertCards, cashStatus } = props;

  return (
    <div className="min-h-screen bg-white text-black">
      {/* ✅ ここが見えれば「DashboardClient自体は描画されてる」 */}
      <div className="p-4 border-b border-black/10">
        <div className="text-sm font-semibold">DashboardClient mounted</div>
        <div className="text-xs opacity-70 mt-1">
          accounts: {accounts?.length ?? 0} / monthly: {monthly?.length ?? 0} /
          alertCards: {alertCards?.length ?? 0} / cashStatus:{" "}
          {cashStatus ? "OK" : "null"}
        </div>
        <div className="text-xs opacity-70">
          children: {children ? "present" : "empty"}
        </div>
      </div>

      {/* ✅ 中身（カード群） */}
      <div className="p-4">{children ?? null}</div>
    </div>
  );
}