// app/dashboard/_components/OverviewCard.tsx

import React from "react";
import type { OverviewPayload } from "../_types";

function yen(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `¥${Math.trunc(v).toLocaleString()}`;
}

export default function OverviewCard(props: OverviewPayload) {
  const {
    accountName,
    currentBalance,
    thisMonthIncome,
    thisMonthExpense,
    net,
    monthBalance,
    momDelta,
  } = props;

  return (
    <div style={{ lineHeight: 1.6 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Overview</div>
        <div style={{ opacity: 0.85 }}>Account: {accountName}</div>
      </div>

      <div>
        <div>Current Balance: {yen(currentBalance)}</div>
        <div>This Month Income: {yen(thisMonthIncome)}</div>
        <div>This Month Expense: {yen(thisMonthExpense)}</div>
        <div>Net: {yen(net)}</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600 }}>月次残高</div>
        <div>{yen(monthBalance)}</div>
        <div>前月比: {yen(momDelta)}</div>
      </div>
    </div>
  );
}