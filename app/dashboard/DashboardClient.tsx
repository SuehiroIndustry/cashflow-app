"use client";

import React from "react";
import Link from "next/link";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { OverviewPayload, AlertCardPayload } from "./_types";

type Props = {
  cashStatus: OverviewPayload | null;
  alertCards: AlertCardPayload[];
  children?: React.ReactNode;
};

export default function DashboardClient({ cashStatus, alertCards, children }: Props) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cashflow Dashboard
            </h1>
          </div>

          {/* ✅ 右上：ページ遷移 */}
          <div className="flex items-center gap-2">
            <Link
              href="/simulation"
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
            >
              Simulationへ
            </Link>
          </div>
        </div>

        {/* 既存のダッシュボード本体 */}
        {children ?? (
          <div className="grid gap-4 md:grid-cols-3">
            <OverviewCard />
            <BalanceCard />
            <EcoCharts />
          </div>
        )}

        {/* もし alertCards/cashStatus をここで使ってるなら、既存の表示はそのまま残してOK */}
        {/* ※あなたの現状実装では、子コンポーネント側で参照してる想定 */}
      </div>
    </div>
  );
}