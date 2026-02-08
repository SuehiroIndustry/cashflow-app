// app/dashboard/BalanceCard.tsx
"use client";

import type { MonthlyBalanceRow } from "./_types";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function BalanceCard(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  // rows は page.tsx 側で「昇順」で渡す前提（末尾が最新）
  const latest = rows.length ? rows[rows.length - 1] : null;

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
      <div className="text-sm text-white/70">Balance</div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {latest ? yen(latest.balance) : "-"}
      </div>
    </div>
  );
}