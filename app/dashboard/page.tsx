// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

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

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const accounts = (await getAccounts()) as AccountRow[];

  const selectedFromQuery = toInt(searchParams?.cashAccountId);
  const cashAccountId = selectedFromQuery ?? (accounts?.[0]?.id ?? null);

  const month = monthStartISO();

  const overview = cashAccountId
    ? await getOverview({ cashAccountId, month })
    : null;

  const cashStatus = (overview as any)?.cashStatus ?? null;
  const alertCards = ((overview as any)?.alertCards ?? []) as AlertCard[];

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
      {/* ✅ ここは一旦 “仮表示”。カードは props が揃ってから戻す */}
      <div className="p-6">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm opacity-80 mt-2">
          UI components are temporarily disabled due to required props (payload).
        </p>

        <div className="mt-4 text-sm">
          <div>cashAccountId: {cashAccountId ?? "null"}</div>
          <div>month: {month}</div>
          <div>alertCards: {alertCards.length}</div>
          <div>monthly rows: {monthly.length}</div>
        </div>
      </div>
    </DashboardClient>
  );
}