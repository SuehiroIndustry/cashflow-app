// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getCashStatus } from "./_actions/getCashStatus";
import { getAlertCards } from "./_actions/getAlertCards";

export default async function Page() {
  const [cashStatus, alertCards] = await Promise.all([
    getCashStatus(),
    getAlertCards(),
  ]);

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}