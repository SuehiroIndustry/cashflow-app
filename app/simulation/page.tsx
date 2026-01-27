// app/simulation/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import SimulationClient from "./simulation-client";
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getSimulation } from "./_actions/getSimulation";

export default async function SimulationPage() {
  const accounts = await getAccounts();

  // ✅ Simulationは「全口座」固定（account=0）
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

  return (
    <SimulationClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      simulation={sim}
    />
  );
}