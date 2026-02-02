// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

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

type DashboardPayload = {
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
  overviewPayload: OverviewPayload | null;
  monthly: MonthlyBalanceRow[];
};

export default async function Page({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId);

  const accounts = await getAccounts();

  // 口座未選択：カード描画せず、選択を促す（payload必須地雷を踏まない）
  if (!cashAccountId) {
    const payload: DashboardPayload = {
      cashStatus: null,
      alertCards: [],
      overviewPayload: null,
      monthly: [],
    };

    return (
      <DashboardClient
        accounts={accounts as AccountRow[]}
        selectedAccountId={null}
        payload={payload}
      >
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
          まずは口座を選択してください。
        </div>
      </DashboardClient>
    );
  }

  // 口座選択あり
  const [overviewPayload, monthly] = await Promise.all([
    getOverview({ cashAccountId, month: monthStartISO() }),
    getMonthlyBalance({ cashAccountId, months: 12 }),
  ]);

  const payload: DashboardPayload = {
    cashStatus: null,
    alertCards: [],
    overviewPayload: (overviewPayload ?? null) as OverviewPayload | null,
    monthly: (monthly ?? []) as MonthlyBalanceRow[],
  };

  return (
    <DashboardClient
      accounts={accounts as AccountRow[]}
      selectedAccountId={cashAccountId}
      payload={payload}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={payload} />
        <BalanceCard payload={payload} />
        <EcoCharts payload={payload} />
      </div>
    </DashboardClient>
  );
}