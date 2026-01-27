// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardClient from "./DashboardClient";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  searchParams?: Promise<{ account?: string }>;
};

function monthLabelFrom(s: string): string {
  // "YYYY-MM-..." or "YYYY-MM" を "YYYY-MM" に寄せる
  if (!s) return "";
  return s.slice(0, 7);
}

function pickLatestMonthRow(rows: MonthlyBalanceRow[]): MonthlyBalanceRow | null {
  if (!rows || rows.length === 0) return null;
  // monthが "YYYY-MM-01" 前提で辞書順が時間順になる
  const sorted = [...rows].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  return sorted[0] ?? null;
}

function buildAlerts(params: {
  currentBalance: number | null;
  monthNet: number | null;
  accountsCount: number;
  monthlyCount: number;
}): AlertCard[] {
  const { currentBalance, monthNet, accountsCount, monthlyCount } = params;

  const alerts: AlertCard[] = [];

  // ✅ info: データ不足
  if (accountsCount === 0) {
    alerts.push({
      severity: "info",
      title: "口座が未登録です",
      description: "まずは口座を登録してください。口座がないとダッシュボードは判断できません。",
      actionLabel: "口座を確認",
      href: "/accounts",
    });
    return alerts;
  }

  if (monthlyCount === 0) {
    alerts.push({
      severity: "info",
      title: "月次データがまだありません",
      description: "取引データが無いか、集計が未実行の可能性があります。",
      actionLabel: "取引を確認",
      href: "/cash-flows",
    });
  }

  // ✅ critical: 残高が少ない（暫定の閾値。後で設定値化してOK）
  const CRITICAL_BALANCE = 300_000;
  if (typeof currentBalance === "number" && currentBalance <= CRITICAL_BALANCE) {
    // ★要望：Simulationへ誘導しない（警告だけ）
    alerts.push({
      severity: "critical",
      title: "残高が危険水域です",
      description: `現在残高が ${currentBalance.toLocaleString()} 円です。支払い予定があるなら、資金ショートが現実的です。`,
      // actionLabel / href は付けない
    });
  }

  // ✅ warning: 今月が赤字
  if (typeof monthNet === "number" && monthNet < 0) {
    alerts.push({
      severity: "warning",
      title: "今月の収支がマイナスです",
      description: `今月の差額が ${monthNet.toLocaleString()} 円です。固定費か突発支出の内訳確認を推奨します。`,
      actionLabel: "今月の内訳を見る",
      href: "/cash-flows",
    });
  }

  return alerts;
}

export default async function DashboardPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};

  const accounts = (await getAccounts()) as AccountRow[];

  // URLの account を優先。なければ先頭口座。何もなければ null
  const accountParam = sp.account ? Number(sp.account) : NaN;
  const selectedAccountId =
    Number.isFinite(accountParam)
      ? accountParam
      : accounts.length > 0
      ? accounts[0].id
      : null;

  const monthly =
    selectedAccountId != null
      ? ((await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })) as MonthlyBalanceRow[])
      : [];

  const selectedAccount =
    selectedAccountId != null ? accounts.find((a) => a.id === selectedAccountId) ?? null : null;

  const latest = pickLatestMonthRow(monthly);

  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName: selectedAccount?.name ?? null,
    currentBalance: selectedAccount ? Number(selectedAccount.current_balance) : null,

    monthLabel: latest ? monthLabelFrom(latest.month) : null,
    monthIncome: latest ? Number(latest.income) : null,
    monthExpense: latest ? Number(latest.expense) : null,
    monthNet: latest ? Number(latest.balance) : null,

    updatedAtISO: new Date().toISOString(),
  };

  // ✅ ここが今回のビルドエラーの原因だった箇所（alertCards が無いのに渡してた）
  const alertCards = buildAlerts({
    currentBalance: cashStatus.currentBalance,
    monthNet: cashStatus.monthNet,
    accountsCount: accounts.length,
    monthlyCount: monthly.length,
  });

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