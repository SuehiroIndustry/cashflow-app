"use client";

import React from "react";
import Link from "next/link";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { OverviewPayload, MonthlyBalanceRow } from "./_types";

type Props = {
  cashStatus: OverviewPayload | null;
  alertCards: unknown[]; // いったん型揺れ吸収（後で戻す）
  monthlyBalanceRows?: MonthlyBalanceRow[]; // ✅ BalanceCard / EcoCharts 用
  children?: React.ReactNode;
};

export default function DashboardClient({
  cashStatus,
  alertCards,
  monthlyBalanceRows,
  children,
}: Props) {
  const payload: OverviewPayload = cashStatus ?? {
    cashAccountId: 0,
    accountName: "",
    currentBalance: 0,
    thisMonthIncome: 0,
    thisMonthExpense: 0,
    net: 0,
  };

  const rows: MonthlyBalanceRow[] = monthlyBalanceRows ?? [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cashflow Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/simulation"
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
            >
              Simulationへ
            </Link>
          </div>
        </div>

        {/* Main */}
        {children ?? (
          <div className="grid gap-4 md:grid-cols-3">
            <OverviewCard payload={payload} />
            <BalanceCard rows={rows} />
            {/* ✅ EcoCharts も rows 必須 */}
            <EcoCharts rows={rows} />
          </div>
        )}
      </div>
    </div>
  );
}