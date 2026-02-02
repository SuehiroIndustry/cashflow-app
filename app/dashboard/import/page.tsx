// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "../DashboardClient";

import OverviewCard from "../_components/OverviewCard";
import BalanceCard from "../_components/BalanceCard";
import EcoCharts from "../_components/EcoCharts";

import { getAccounts } from "../_actions/getAccounts";

export default async function Page() {
  const accounts = await getAccounts();

  return (
    <DashboardClient accounts={accounts} selectedAccountId={null}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}