// app/dashboard/_components/OverviewCard.tsx
import React from "react";

export default function OverviewCard(props: {
  accountName: string;
  currentBalance: number;
  income: number;
  expense: number;
  net: number;
}) {
  const { accountName, currentBalance, income, expense, net } = props;

  const yen = (n: number) =>
    `¥${Number.isFinite(n) ? Math.trunc(n).toLocaleString() : "0"}`;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Overview</div>

      <div>Account: {accountName}</div>
      <div>Current Balance: {yen(currentBalance)}</div>
      <div>This Month Income: {yen(income)}</div>
      <div>This Month Expense: {yen(expense)}</div>
      <div>Net: {yen(net)}</div>
    </div>
  );
}