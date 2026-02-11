// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
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

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  // 1) 口座一覧
  const accounts = (await getAccounts()) as AccountRow[];

  // 2) 表示対象の口座ID（URL優先 → なければ先頭）
  const selectedFromQuery = toInt(searchParams?.cashAccountId);
  const cashAccountId = selectedFromQuery ?? (accounts?.[0]?.id ?? null);

  // 3) month（getOverview Input 必須）
  const month = monthStartISO();

  // 4) Overview（危険信号など）
  const overview = cashAccountId
    ? await getOverview({ cashAccountId, month })
    : null;

  const cashStatus = (overview as any)?.cashStatus ?? null;
  const alertCards = ((overview as any)?.alertCards ?? []) as AlertCard[];

  // 5) 月次推移
  const monthlyRaw = (cashAccountId
    ? await getMonthlyBalance({ cashAccountId, months: 12 })
    : []) as MonthlyBalanceRow[];

  // ✅ カード側が「末尾=最新」前提なので、昇順に整える
  const monthly: MonthlyBalanceRow[] = [...monthlyRaw].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  // --- OverviewCard 用 payload を組み立てる ---
  const account = accounts?.find((a: any) => a.id === cashAccountId) as any;
  const accountName =
    typeof account?.name === "string"
      ? account.name
      : typeof account?.account_name === "string"
      ? account.account_name
      : "-";

  const thisMonthRow = monthly.find((r) => r.month === month);
  const thisMonthIncome = thisMonthRow?.income ?? 0;
  const thisMonthExpense = thisMonthRow?.expense ?? 0;
  const net = thisMonthIncome - thisMonthExpense;

  // currentBalance は overview 側にあるなら優先、なければ当月 balance、無ければ最新行の balance
  const latestRow = monthly.length ? monthly[monthly.length - 1] : null;
  const currentBalance =
    (overview as any)?.currentBalance ??
    (overview as any)?.balance ??
    thisMonthRow?.balance ??
    latestRow?.balance ??
    0;

  const overviewPayload: OverviewPayload = {
    accountName,
    currentBalance,
    thisMonthIncome,
    thisMonthExpense,
    net,
  } as OverviewPayload;

  return (
     <div className="mx-auto w-full max-w-6xl px-4 py-6 text-white">
    <DashboardClient
      cashStatus={cashStatus as CashStatus}
      alertCards={alertCards}
      accounts={accounts}
      monthly={monthly}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={overviewPayload} />
        <BalanceCard rows={monthly} />
        <EcoCharts rows={monthly} />
      </div>
    </DashboardClient>
    </div>
  );
}