// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    cashAccountId?: string | string[];
  };
};

function toInt(v: unknown): number | null {
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(v) && typeof v[0] === "string") {
    const n = Number(v[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const rawAccounts = await getAccounts();

  const accounts: AccountRow[] = (rawAccounts ?? []).map((a: any) => ({
    id: Number(a.id),
    name: String(a.name ?? ""),
    current_balance: Number(a.current_balance ?? 0),
  }));

  if (!accounts.length) {
    const cashStatus: CashStatus = {
      selectedAccountId: null,
      selectedAccountName: null,
      currentBalance: null,
      monthLabel: null,
      monthIncome: null,
      monthExpense: null,
      monthNet: null,
      updatedAtISO: new Date().toISOString(),
    };

    const alertCards: AlertCard[] = [
      {
        severity: "info",
        title: "口座が未登録です",
        description: "cash_accounts に口座を作成してください。",
      },
    ];

    const overviewPayload: OverviewPayload = {
      accountName: "-",
      currentBalance: 0,
      thisMonthIncome: 0,
      thisMonthExpense: 0,
      net: 0,
    };

    const monthly: MonthlyBalanceRow[] = [];

    return (
      <DashboardClient
        accounts={accounts}
        selectedAccountId={null}
        monthly={monthly}
        cashStatus={cashStatus}
        alertCards={alertCards}
        overviewPayload={overviewPayload}
      />
    );
  }

  const requestedId = toInt(searchParams?.cashAccountId);

  const selectedAccountId =
    requestedId != null && accounts.some((a) => a.id === requestedId)
      ? requestedId
      : accounts[0].id;

  const currentAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // 月次（12ヶ月）
  const monthlyDesc: MonthlyBalanceRow[] = await getMonthlyBalance({
    cashAccountId: selectedAccountId,
    months: 12,
  });

  // UI用に昇順へ
  const monthly = [...monthlyDesc].reverse();
  const latest = monthly.length ? monthly[monthly.length - 1] : null;

  const monthForOverview = latest?.month ?? monthStartISO();

  // getOverview は「今月のin/out」算出用…だが今は信用しない（0で上書きされるため）
  // いったん呼ぶだけにして、値は使わない（将来直したら使う）
  await getOverview({
    cashAccountId: selectedAccountId,
    month: monthForOverview,
  });

  // ✅ monthly を正にする（SSOT）
  const thisMonthIncome = latest?.income ?? 0;
  const thisMonthExpense = latest?.expense ?? 0;
  const monthNet = thisMonthIncome - thisMonthExpense;

  // ✅ currentBalance も monthly があればそちらを採用
  const currentBalanceResolved =
    typeof (latest as any)?.balance === "number"
      ? (latest as any).balance
      : currentAccount.current_balance ?? 0;

  const overviewPayload: OverviewPayload = {
    accountName: currentAccount.name || "-",
    currentBalance: currentBalanceResolved,
    thisMonthIncome,
    thisMonthExpense,
    net: monthNet,
  };

  const monthLabel = latest?.month ? String(latest.month).slice(0, 7) : null;

  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName: currentAccount.name ?? null,
    currentBalance: currentBalanceResolved,
    monthLabel,
    monthIncome: latest?.income ?? null,
    monthExpense: latest?.expense ?? null,
    monthNet: latest ? monthNet : null,
    updatedAtISO: new Date().toISOString(),
  };

  const alertCards: AlertCard[] = [];
  if ((cashStatus.currentBalance ?? 0) <= 0) {
    alertCards.push({
      severity: "critical",
      title: "残高が危険水域です",
      description:
        "現在残高が 0 円以下です。支払い予定があるなら、資金ショートが現実的です。",
      actionLabel: "Simulationへ",
      href: `/simulation?cashAccountId=${selectedAccountId}`,
    });
  }

  return (
    <DashboardClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
      cashStatus={cashStatus}
      alertCards={alertCards}
      overviewPayload={overviewPayload}
    />
  );
}