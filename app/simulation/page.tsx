// app/simulation/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import SimulationClient from "./simulation-client";
import { getSimulation } from "./_actions/getSimulation";

export default async function SimulationPage() {
  // ✅ Simulationは全口座固定：cashAccountId=0
  const sim = await getSimulation({
    cashAccountId: 0,
    months: 24,
    avgWindowMonths: 6,
    horizonMonths: 12,
  });

  return <SimulationClient simulation={sim} />;
}