// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "../DashboardClient";
import ImportClient from "./ImportClient";

import { getAccounts } from "../_actions/getAccounts";
import { getOverview } from "../_actions/getOverview";
import { getMonthlyBalance } from "../_actions/getMonthlyBalance";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "../_types";

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function ImportPage() {
  // ✅ 楽天銀行固定
  const cashAccountId = 2;

  // 上バー用のデータ（ロジックじゃなくUI維持のため）
  const accounts = (await getAccounts()) as AccountRow[];

  const month = monthStartISO();
  const overview = await getOverview({ cashAccountId, month });

  const cashStatus = ((overview as any)?.cashStatus ?? null) as CashStatus;
  const alertCards = (((overview as any)?.alertCards ?? []) as AlertCard[]) ?? [];

  const monthlyRaw = (await getMonthlyBalance({
    cashAccountId,
    months: 12,
  })) as MonthlyBalanceRow[];

  const monthly: MonthlyBalanceRow[] = [...(monthlyRaw ?? [])].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return (
    <DashboardClient
      cashStatus={cashStatus}
      alertCards={alertCards}
      accounts={accounts}
      monthly={monthly}
    >
      <ImportClient cashAccountId={cashAccountId} />
    </DashboardClient>
  );
}