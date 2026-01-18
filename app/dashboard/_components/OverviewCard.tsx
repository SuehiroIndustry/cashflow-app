// app/dashboard/_components/OverviewCard.tsx

import React from "react";
import type { OverviewData } from "../_types";

type Props = OverviewData;

export default function OverviewCard(props: Props) {
  const {
    accountName,
    currentBalance,
    thisMonthIncome,
    thisMonthExpense,
    net,
    prevMonthBalance,
  } = props;

  return (
    <div className="space-y-2 text-sm">
      <div>Account: {accountName}</div>

      <div>Current Balance: ¥{currentBalance.toLocaleString()}</div>
      <div>This Month Income: ¥{thisMonthIncome.toLocaleString()}</div>
      <div>This Month Expense: ¥{thisMonthExpense.toLocaleString()}</div>
      <div>Net: ¥{net.toLocaleString()}</div>

      <div className="pt-2 text-xs opacity-70">
        前月比: ¥{(currentBalance - prevMonthBalance).toLocaleString()}
      </div>
    </div>
  );
}