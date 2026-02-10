// app/dashboard/simulation/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardClient from "../DashboardClient";
import SimulationClient from "@/app/simulation/simulation-client";

import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getOverview } from "@/app/dashboard/_actions/getOverview";
import { getMonthlyBalance } from "@/app/dashboard/_actions/getMonthlyBalance";

import { getSimulation } from "@/app/simulation/_actions/getSimulation";
import { listSimulationScenarios } from "@/app/simulation/_actions/scenarios";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "@/app/dashboard/_types";

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardSimulationPage() {
  const accounts = (await getAccounts()) as AccountRow[];

  // ✅ Simulation自体は「全口座のみ」
  const selectedAccountId = 0;

  const sim =
    accounts.length > 0
      ? await getSimulation({
          cashAccountId: selectedAccountId, // 0 = 全口座
          months: 24,
          avgWindowMonths: 6,
          horizonMonths: 12,
        })
      : null;

  const scenarios = await listSimulationScenarios();

  // 上バー用（UI維持）。monthly/getOverview は 0 が通らない可能性があるので、
  // 「表示用に先頭口座」を使う（Simulationの計算ロジックには影響しない）
  const uiCashAccountId = (accounts?.[0]?.id ?? null) as number | null;

  const month = monthStartISO();
  const overview = uiCashAccountId ? await getOverview({ cashAccountId: uiCashAccountId, month }) : null;

  const cashStatus = ((overview as any)?.cashStatus ?? null) as CashStatus;
  const alertCards = (((overview as any)?.alertCards ?? []) as AlertCard[]) ?? [];

  const monthlyRaw = (uiCashAccountId
    ? await getMonthlyBalance({ cashAccountId: uiCashAccountId, months: 12 })
    : []) as MonthlyBalanceRow[];

  const monthly: MonthlyBalanceRow[] = [...(monthlyRaw ?? [])].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards} accounts={accounts} monthly={monthly}>
      <SimulationClient
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        simulation={sim}
        scenarios={scenarios}
      />
    </DashboardClient>
  );
}