// app/dashboard/_components/OverviewCard.tsx

import React from "react";
import type { OverviewPayload } from "../_types";

function yen(n: number) {
  if (!Number.isFinite(n)) return "¥0";
  return `¥${Math.trunc(n).toLocaleString()}`;
}

export default function OverviewCard(props: {
  accountName: string;
  overview: OverviewPayload;
}) {
  const { accountName, overview } = props;

  return (
    <div style={{ border: "1px solid #222", padding: 16, borderRadius: 8 }}>
      <div style={{ marginBottom: 8, fontWeight: 700 }}>Overview</div>

      <div>Account: {accountName}</div>
      <div>Current Balance: {yen(overview.currentBalance)}</div>
      <div>This Month Income: {yen(overview.thisMonthIncome)}</div>
      <div>This Month Expense: {yen(overview.thisMonthExpense)}</div>
      <div>Net: {yen(overview.net)}</div>

      <div style={{ marginTop: 12, fontWeight: 700 }}>月次残高</div>
      <div>{yen(overview.monthBalance)}</div>
      <div>前月比: {yen(overview.monthBalance - overview.prevMonthBalance)}</div>
    </div>
  );
}