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
  if (!s) return "";
  return s.slice(0, 7);
}

function pickLatestMonthRow(rows: MonthlyBalanceRow[]): MonthlyBalanceRow | null {
  if (!rows || rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  return sorted[0] ?? null;
}

function aggregateMonthly(all: MonthlyBalanceRow[][]): MonthlyBalanceRow[] {
  const map = new Map<string, { income: number; expense: number; balance: number }>();

  for (const rows of all) {
    for (const r of rows) {
      const key = r.month;
      const cur = map.get(key) ?? { income: 0, expense: 0, balance: 0 };
      cur.income += Number(r.income ?? 0);
      cur.expense += Number(r.expense ?? 0);
      cur.balance += Number(r.balance ?? 0);
      map.set(key, cur);
    }
  }

  const merged: MonthlyBalanceRow[] = Array.from(map.entries()).map(([month, v]) => ({
    // MonthlyBalanceRow の形に合わせる（必要最低限）
    month,
    income: v.income,
    expense: v.expense,
    balance: v.balance,
  })) as MonthlyBalanceRow[];

  merged.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  return merged;
}

function buildAlerts(params: {
  currentBalance: number | null;
  monthNet: number | null;
  accountsCount: number;
  monthlyCount: number;
}): AlertCard[] {
  const { currentBalance, monthNet, accountsCount, monthlyCount } = params;

  const alerts: AlertCard[] = [];

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

  const CRITICAL_BALANCE = 300_000;
  if (typeof currentBalance === "number" && currentBalance <= CRITICAL_BALANCE) {
    alerts.push({
      severity: "critical",
      title: "残高が危険水域です",
      description: `現在残高が ${currentBalance.toLocaleString()} 円です。支払い予定があるなら、資金ショートが現実的です。`,
      actionLabel: "シミュレーションへ",
      href: "/simulation",
    });
  }

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

  // account=0 を「全口座」として許可
  const accountParamRaw = sp.account ? Number(sp.account) : NaN;

  const selectedAccountId =
    Number.isFinite(accountParamRaw)
      ? accountParamRaw // 0 も含む
      : accounts.length > 0
      ? accounts[0].id
      : null;

  // 月次（全口座=0 の場合は合算）
  const monthly: MonthlyBalanceRow[] =
    selectedAccountId == null
      ? []
      : selectedAccountId === 0
      ? aggregateMonthly(
          await Promise.all(
            accounts.map((a) =>
              getMonthlyBalance({ cashAccountId: a.id, months: 24 }) as Promise<MonthlyBalanceRow[]>
            )
          )
        )
      : ((await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })) as MonthlyBalanceRow[]);

  // 選択口座名 / 残高
  const selectedAccount =
    selectedAccountId != null && selectedAccountId !== 0
      ? accounts.find((a) => a.id === selectedAccountId) ?? null
      : null;

  const currentBalance =
    selectedAccountId == null
      ? null
      : selectedAccountId === 0
      ? accounts.reduce((sum, a) => sum + Number(a.current_balance ?? 0), 0)
      : selectedAccount
      ? Number(selectedAccount.current_balance ?? 0)
      : null;

  const latest = pickLatestMonthRow(monthly);

  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName:
      selectedAccountId === 0 ? "全口座" : selectedAccount?.name ?? null,
    currentBalance,

    monthLabel: latest ? monthLabelFrom(latest.month) : null,
    monthIncome: latest ? Number(latest.income) : null,
    monthExpense: latest ? Number(latest.expense) : null,
    monthNet: latest ? Number(latest.balance) : null,

    updatedAtISO: new Date().toISOString(),
  };

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

  // ✅ critical: 残高が少ない（警告だけ。シミュレーションには飛ばさない）
  const CRITICAL_BALANCE = 300_000;
  if (typeof currentBalance === "number" && currentBalance <= CRITICAL_BALANCE) {
    alerts.push({
      severity: "critical",
      title: "残高が危険水域です",
      description: `現在残高が ${currentBalance.toLocaleString()} 円です。支払い予定があるなら、資金ショートが現実的です。`,
      // ✅ actionLabel / href を付けない
    });
  }

  // ✅ warning: 今月が赤字（これは内訳確認に飛ばしてOK）
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