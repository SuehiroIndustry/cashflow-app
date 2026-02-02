// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import DashboardClient from "./DashboardClient";

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

export default async function Page({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId);

  const [accounts, overviewPayload, monthly] = await Promise.all([
    getAccounts(),
    getOverview({ cashAccountId, month: monthStartISO() }),
    getMonthlyBalance({ cashAccountId, months: 12 }),
  ]);

  // ここは“最小実装”でOK（後でちゃんと作り込む）
  const cashStatus: CashStatus = {
    status: "ok",
    headline: "",
    subline: "",
  };

  const alertCards: AlertCard[] = [];

  return (
    <DashboardClient
      accounts={accounts as AccountRow[]}
      selectedAccountId={cashAccountId}
      monthly={monthly as MonthlyBalanceRow[]}
      cashStatus={cashStatus}
      alertCards={alertCards}
      overviewPayload={overviewPayload as OverviewPayload}
    />
  );
}