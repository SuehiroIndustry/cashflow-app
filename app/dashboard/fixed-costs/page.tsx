// app/dashboard/fixed-costs/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "../DashboardClient";
import FixedCostsClient from "./FixedCostsClient";
import { listFixedCosts } from "./_actions";

import { getAccounts } from "../_actions/getAccounts";
import { getOverview } from "../_actions/getOverview";
import { getMonthlyBalance } from "../_actions/getMonthlyBalance";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "../_types";

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function FixedCostsPage() {
  // DashboardClient が期待している props を一応渡す（ナビ統一のため）
  const accounts = (await getAccounts()) as AccountRow[];

  const cashAccountId = (accounts?.[0]?.id ?? null) as number | null;
  const month = monthStartISO();

  const overview = cashAccountId ? await getOverview({ cashAccountId, month }) : null;
  const cashStatus = ((overview as any)?.cashStatus ?? null) as CashStatus;
  const alertCards = (((overview as any)?.alertCards ?? []) as AlertCard[]) ?? [];

  const monthly = (cashAccountId
    ? await getMonthlyBalance({ cashAccountId, months: 12 })
    : []) as MonthlyBalanceRow[];

  const items = await listFixedCosts();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 text-white">
    <DashboardClient
      cashStatus={cashStatus}
      alertCards={alertCards}
      accounts={accounts}
      monthly={monthly}
    >
      <FixedCostsClient initialItems={items} />
    </DashboardClient>
    </div>
  );
}