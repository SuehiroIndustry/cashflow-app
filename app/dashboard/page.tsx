// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";

import type { AlertCard, CashStatus } from "./_types";
import type { AccountRow, MonthlyBalanceRow } from "./_types";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toNumberOrNull(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  // URL例: /dashboard?accountId=123
  // null のときは「全口座」
  const selectedAccountId = toNumberOrNull(sp.accountId);

  // 1) 口座一覧
  const accounts: AccountRow[] = await getAccounts();

  // 2) 月次（全口座 or 選択口座）
  const monthsToShow = 12;
  const monthly: MonthlyBalanceRow[] = await getMonthlyBalance({
    cashAccountId: selectedAccountId,
    months: monthsToShow,
  });

  const selectedAccount =
    selectedAccountId != null
      ? accounts.find((a) => a.id === selectedAccountId) ?? null
      : null;

  // 3) 現在残高
  const currentBalance =
    selectedAccountId != null
      ? selectedAccount?.current_balance ?? null
      : accounts.length
        ? accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0)
        : null;

  // 4) 今月（latest）
  const latest = monthly.length ? monthly[monthly.length - 1] : null;

  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName: selectedAccountId != null ? selectedAccount?.name ?? null : "全口座",
    currentBalance,

    monthLabel: latest?.month ?? null,
    monthIncome: latest?.income ?? null,
    monthExpense: latest?.expense ?? null,
    monthNet:
      latest != null
        ? (latest.income ?? 0) - (latest.expense ?? 0)
        : null,

    updatedAtISO: new Date().toISOString(),
  };

  // 5) アラート（ここに level/title/message を寄せる）
  const alertCards: AlertCard[] = [];

  if (typeof currentBalance === "number") {
    if (currentBalance <= 0) {
      alertCards.push({
        severity: "critical",
        title: "残高が危険水域です",
        description:
          "現在残高が 0 円以下です。支払い予定があるなら、資金ショートが現実的です。",
        // 今はシミュレーションへ飛ばさない方針なのでリンクは出さない
        // actionLabel/href は無し
      });
    } else if (currentBalance < 100000) {
      alertCards.push({
        severity: "warning",
        title: "残高が少なめです",
        description:
          "残高が 10万円未満です。近い支払い予定と入金予定を確認しておくと安全です。",
      });
    }
  }

  // 楽天CSVアップロードの導線（DashboardClient側のヘッダにもリンク入れてるが、ここにも出したいならアラートで出せる）
  alertCards.push({
    severity: "info",
    title: "楽天銀行の明細CSV",
    description: "週1回の運用：楽天銀行CSVをアップロードして明細を取り込みます。",
    actionLabel: "アップロードへ",
    href: "/cash/import/rakuten",
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