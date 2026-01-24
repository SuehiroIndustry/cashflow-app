import DashboardClient from "./DashboardClient";
import { getDashboardCashStatus } from "./_actions/getDashboardCashStatus";
import { getDashboardCashAlertCards } from "./_actions/getDashboardCashAlertCards";

// 例：元からあったやつ
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

const THRESHOLD = 1_000_000;

export default async function DashboardPage() {
  const cashStatus = await getDashboardCashStatus(THRESHOLD);
  const alertCards =
    cashStatus.status === "ok" ? [] : await getDashboardCashAlertCards(THRESHOLD);

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>

      {/* 表とか他の要素があればここに */}
    </DashboardClient>
  );
}