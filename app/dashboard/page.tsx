// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

type Props = {
  searchParams?: {
    cashAccountId?: string;
  };
};

export default async function Page({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId);

  const accounts = await getAccounts();

  // ✅ 未選択なら「初期データ無し」で表示（型地雷を踏まない）
  if (!cashAccountId) {
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

  const [ov, monthly] = await Promise.all([
    getOverview({ cashAccountId, month: monthStartISO() }),
    getMonthlyBalance({ cashAccountId, months: 12 }),
  ]);

  // getOverview の返り値に合わせて「あるものだけ」渡す（欠けても死なない）
  // @ts-expect-error: runtime-safe extraction
  const initialCashStatus = ov?.cashStatus ?? null;
  // @ts-expect-error: runtime-safe extraction
  const initialAlertCards = Array.isArray(ov?.alertCards) ? ov.alertCards : [];
  // @ts-expect-error: runtime-safe extraction
  const initialOverviewPayload = ov?.overviewPayload ?? ov?.overview ?? null;

  return (
    <DashboardClient
      accounts={accounts}
      selectedAccountId={cashAccountId}
      initialCashStatus={initialCashStatus}
      initialAlertCards={initialAlertCards}
      initialOverviewPayload={initialOverviewPayload}
      initialMonthly={Array.isArray(monthly) ? monthly : []}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}