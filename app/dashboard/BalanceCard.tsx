// app/dashboard/_components/BalanceCard.tsx
"use client";

import type { MonthlyBalanceRow } from "./_types";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function BalanceCard(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  const latest = rows.length ? rows[rows.length - 1] : null;

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-muted-foreground">Balance</div>
      <div className="mt-2 text-2xl font-semibold">
        {latest ? yen(latest.balance) : "-"}
      </div>
    </div>
  );
}