// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";
import { getCashStatus } from "./_actions/getCashStatus";
import { getAlertCards } from "./_actions/getAlertCards";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
} from "./_types";

type DashboardPayload = {
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
  overviewPayload: OverviewPayload | null;
  monthly: MonthlyBalanceRow[];
};

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

  const accounts = (await getAccounts()) as AccountRow[];

  // 口座未選択：落ちない payload を渡す
  if (!cashAccountId) {
    const payload: DashboardPayload = {
      cashStatus: null,
      alertCards: [],
      overviewPayload: null,
      monthly: [],
    };

    return (
      <DashboardClient
        accounts={accounts}
        selectedAccountId={null}
        payload={payload}
      />
    );
  }

  // 口座選択あり：必要データ取得
  const [overviewPayload, monthly, cashStatus, alertCards] = await Promise.all([
    getOverview({ cashAccountId, month: monthStartISO() }),
    getMonthlyBalance({ cashAccountId, months: 12 }),
    getCashStatus({ cashAccountId }),
    getAlertCards({ cashAccountId }),
  ]);

  const payload: DashboardPayload = {
    cashStatus: (cashStatus ?? null) as CashStatus | null,
    alertCards: (alertCards ?? []) as AlertCard[],
    overviewPayload: (overviewPayload ?? null) as OverviewPayload | null,
    monthly: (monthly ?? []) as MonthlyBalanceRow[],
  };

  return (
    <DashboardClient
      key={`dash-${cashAccountId}`}
      accounts={accounts}
      selectedAccountId={cashAccountId}
      payload={payload}
    />
  );
}