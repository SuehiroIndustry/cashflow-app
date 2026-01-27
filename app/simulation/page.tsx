// app/simulation/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import SimulationClient from "./simulation-client";
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getSimulation } from "./_actions/getSimulation";
import { listSimulationScenarios } from "./_actions/scenarios";

type Props = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

export default async function SimulationPage(_props: Props) {
  const accounts = await getAccounts();

  // ✅ Simulationは「全口座のみ」
  const selectedAccountId = 0;

  const sim =
    accounts.length > 0
      ? await getSimulation({
          cashAccountId: selectedAccountId, // 0 = 全口座（Dashboard側と同じ扱い）
          months: 24,
          avgWindowMonths: 6,
          horizonMonths: 12,
        })
      : null;

  const scenarios = await listSimulationScenarios();

  return (
    <SimulationClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      simulation={sim}
      scenarios={scenarios}
    />
  );
}