// app/dashboard/DashboardClient.tsx
"use client";

import type {
  CashStatus,
  AlertCard,
  AccountRow,
  MonthlyBalanceRow,
} from "./_types";

type Props = {
  children: React.ReactNode;

  // ✅ 互換性のために受け取れるようにする（他ページが渡してくる）
  // ※ このコンポーネント内では使わない
  cashStatus?: CashStatus;
  alertCards?: AlertCard[];
  accounts?: AccountRow[];
  monthly?: MonthlyBalanceRow[];
};

export default function DashboardClient({ children }: Props) {
  // ✅ layout.tsx が全ページ共通ヘッダーなので、ここでは何もしない
  return <>{children}</>;
}