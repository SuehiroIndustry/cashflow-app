// app/dashboard/_components/OverviewCard.tsx
import React from "react";
import type { OverviewPayload } from "../_types";

export default function OverviewCard(props: {
  accountName: string;
  payload: OverviewPayload;
}) {
  const { accountName, payload } = props;

  return (
    <div>
      <h3>Overview ({accountName})</h3>
      <div>Current Balance: ¥{payload.currentBalance.toLocaleString()}</div>
      <div>This Month Income: ¥{payload.monthIncome.toLocaleString()}</div>
      <div>This Month Expense: ¥{payload.monthExpense.toLocaleString()}</div>
      <div>Net: ¥{payload.net.toLocaleString()}</div>
    </div>
  );
}