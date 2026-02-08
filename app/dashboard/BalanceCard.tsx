// app/dashboard/_components/BalanceCard.tsx
"use client";

import type { MonthlyBalanceRow } from "../_types";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function BalanceCard(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  // rows は page.tsx 側で「昇順」にして渡す前提（末尾が最新）
  const latest = rows.length ? rows[rows.length - 1] : null;

  return (
    <div className="rounded-2xl border p-4 bg-white text-black">
      <div className="text-sm text-black/60">Balance</div>
      <div className="mt-2 text-2xl font-semibold">
        {latest ? yen(latest.balance) : "-"}
      </div>
    </div>
  );
}