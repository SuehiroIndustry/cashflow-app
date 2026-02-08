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
  const { children } = props;

  // ✅ まずは「画面が出る」状態に戻す（UIの中身は後で復旧）
  return (
    <div className="min-h-screen bg-white text-black">
      {children ?? null}
    </div>
  );
}