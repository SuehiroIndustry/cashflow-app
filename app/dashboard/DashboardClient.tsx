"use client";

import React from "react";
import Link from "next/link";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
};

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
}: Props) {
  // Dashboard 内カード用に “rows” を確実に用意
  const rows: MonthlyBalanceRow[] = Array.isArray(monthly) ? monthly : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          </div>

          {/* ✅ Dashboard ⇄ Simulation の導線 */}
          <div className="flex items-center gap-2">
            <Link
              href="/simulation"
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
            >
              Simulationへ
            </Link>
          </div>
        </div>

        {/* ここに alertCards を出しているコンポーネントがあるなら挿す（今は型だけ維持） */}
        {/* 例：<AlertCards cards={alertCards} /> */}

        {/* Main */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* OverviewCard が payload 必須の場合に備えて cashStatus をそのまま渡せるようにしておく */}
          {/* もし OverviewCard が cashStatus を受けないなら、OverviewCard 側の Props を貼って。合わせる。 */}
          <OverviewCard payload={cashStatus as any} />

          {/* ✅ BalanceCard / EcoCharts は rows 必須の想定で統一 */}
          <BalanceCard rows={rows} />
          <EcoCharts rows={rows} />
        </div>

        {/* 下部にも導線（迷子防止） */}
        <div className="mt-8 flex justify-end">
          <Link
            href="/simulation"
            className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
          >
            Simulationへ
          </Link>
        </div>
      </div>
    </div>
  );
}