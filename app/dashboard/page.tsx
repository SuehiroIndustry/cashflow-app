// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

// ここは君の実ファイルに合わせてパス調整してOK
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
} from "./_types";

type Props = {
  searchParams?: {
    cashAccountId?: string;
  };
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function DashboardPage({ searchParams }: Props) {
  // 1) 口座一覧
  const accounts = (await getAccounts()) as AccountRow[];

  // 2) 表示対象の口座ID（URL優先 → なければ先頭）
  const selectedFromQuery = toInt(searchParams?.cashAccountId);
  const cashAccountId =
    selectedFromQuery ?? (accounts?.[0]?.id ?? null);

  // 3) Overview（危険信号など）
  const overview = cashAccountId
    ? await getOverview({ cashAccountId })
    : null;

  // ✅ getOverview の戻りが違う場合はここだけ合わせればOK
  const cashStatus = (overview as any)?.cashStatus ?? null;
  const alertCards = ((overview as any)?.alertCards ?? []) as AlertCard[];

  // 4) 月次推移
  const monthly = (cashAccountId
    ? await getMonthlyBalance({ cashAccountId, months: 12 })
    : []) as MonthlyBalanceRow[];

  return (
    <DashboardClient
      cashStatus={cashStatus as CashStatus}
      alertCards={alertCards}
      accounts={accounts}
      monthly={monthly}
    >
      {/* ✅ ここが “children” になる。自己閉じにしない */}
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard />
        <BalanceCard />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}