// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type PageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

function toNumber(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // 1) 口座一覧
  const accounts: AccountRow[] = await getAccounts();

  // 2) 選択口座ID（URLクエリ優先、なければ先頭、なければ null）
  const qs = searchParams?.cashAccountId;
  const cashAccountIdFromQS = Array.isArray(qs) ? toNumber(qs[0]) : toNumber(qs);
  const fallbackId = accounts.length ? accounts[0].id : null;

  const selectedAccountId: number | null = cashAccountIdFromQS ?? fallbackId;

  const selectedAccount: AccountRow | null =
    selectedAccountId != null
      ? accounts.find((a) => a.id === selectedAccountId) ?? null
      : null;

  // 3) 月次（選択口座がある時だけ）
  const monthly: MonthlyBalanceRow[] =
    selectedAccountId != null
      ? await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 12 })
      : [];

  const latestMonth = monthly.length ? monthly[monthly.length - 1] : null;

  // 4) CashStatus（_types.ts に合わせる）
  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName: selectedAccount?.name ?? null,
    currentBalance: selectedAccount?.current_balance ?? null,

    monthLabel: latestMonth?.month ?? null,
    monthIncome: latestMonth?.income ?? null,
    monthExpense: latestMonth?.expense ?? null,
    monthNet:
      latestMonth != null
        ? (latestMonth.income ?? 0) - (latestMonth.expense ?? 0)
        : null,

    updatedAtISO: new Date().toISOString(),
  };

  // 5) アラート（AlertCard 型に合わせる）
  const alertCards: AlertCard[] = [];
  const bal = cashStatus.currentBalance ?? 0;

  if (selectedAccountId == null) {
    alertCards.push({
      severity: "warning",
      title: "口座が未選択です",
      description: "口座を選択してください。",
    });
  } else if (bal <= 0) {
    alertCards.push({
      severity: "critical",
      title: "残高が危険水域です",
      description:
        "現在残高が 0 円以下です。支払い予定があるなら、資金ショートが現実的です。",
    });
  }

  return (
    <DashboardClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
      cashStatus={cashStatus}
      alertCards={alertCards}
    />
  );
}