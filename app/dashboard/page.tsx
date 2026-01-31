// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type PageProps = {
  searchParams?: {
    cashAccountId?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  // 1) 口座一覧
  const accounts: AccountRow[] = await getAccounts();

  // 2) URL（cashAccountId）を最優先にする。なければ先頭口座。
  const requestedId =
    typeof searchParams?.cashAccountId === "string"
      ? Number(searchParams.cashAccountId)
      : NaN;

  const fallbackId = accounts[0]?.id ?? null;
  const selectedAccountId =
    Number.isFinite(requestedId) && accounts.some((a) => a.id === requestedId)
      ? requestedId
      : fallbackId;

  // 3) 月次残高（選択口座がある時だけ）
  const monthly: MonthlyBalanceRow[] = selectedAccountId
    ? await getMonthlyBalance({ cashAccountId: selectedAccountId })
    : [];

  // 4) CashStatus（UI用。DashboardClient でも作れるが、SSRで固定しておく）
  const selected = accounts.find((a) => a.id === selectedAccountId) ?? null;
  const latest = monthly.length ? monthly[monthly.length - 1] : null;

  const cashStatus: CashStatus = {
    selectedAccountId: selectedAccountId ?? null,
    selectedAccountName: selected?.name ?? null,
    currentBalance: selected?.current_balance ?? null,

    monthLabel: latest?.month ?? null,
    monthIncome: latest?.income ?? null,
    monthExpense: latest?.expense ?? null,
    monthNet:
      latest ? (latest.income ?? 0) - (latest.expense ?? 0) : null,

    updatedAtISO: new Date().toISOString(),
  };

  // 5) アラートカード（必要最低限。将来拡張OK）
  const alertCards: AlertCard[] = [];
  const bal = cashStatus.currentBalance ?? 0;
  if (selectedAccountId && bal <= 0) {
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