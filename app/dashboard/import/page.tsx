// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getCashStatus } from "./_actions/getCashStatus";
import { getAlertCards } from "./_actions/getAlertCards";

import type { CashStatus, AlertCard } from "./_types";

export default async function DashboardPage() {
  // ✅ ここは「危険信号だけ」のためにサーバー側で取る（今まで通りの思想）
  const [cashStatus, alertCards] = await Promise.all([
    getCashStatus().catch(() => ({ status: "unknown" } as CashStatus)),
    getAlertCards().catch(() => [] as AlertCard[]),
  ]);

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      {/* ✅ ダッシュボード本体（カード等）は page.tsx 側で固定表示 */}
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}