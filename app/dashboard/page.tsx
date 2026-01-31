// app/dashboard/page.tsx
import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import DashboardClient from "./DashboardClient";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard, OverviewPayload } from "./_types";

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
  // YYYY-MM-01
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const accounts: AccountRow[] = await getAccounts();

  // 口座が無いなら表示だけ返す（落とさない）
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
        key="no-accounts"
        accounts={accounts}
        selectedAccountId={null}
        monthly={monthly}
        cashStatus={cashStatus}
        alertCards={alertCards}
        overviewPayload={overviewPayload}
      />
    );
  }

  // URL の cashAccountId を唯一の基準にする（なければ先頭）
  const requestedId = toInt(searchParams?.cashAccountId);
  const selectedAccountId =
    requestedId != null && accounts.some((a) => a.id === requestedId)
      ? requestedId
      : accounts[0].id;

  const currentAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // 月次（12ヶ月）
  const monthly: MonthlyBalanceRow[] = await getMonthlyBalance({
    cashAccountId: selectedAccountId,
    months: 12,
  });

  const latest = monthly.length ? monthly[monthly.length - 1] : null;

  // getOverview は month 必須（あなたのエラー画像の通り）
  const monthForOverview = latest?.month ?? monthStartISO();

  const overviewFromAction = await getOverview({
    cashAccountId: selectedAccountId,
    month: monthForOverview,
  });

  // OverviewCard 仕様に合わせて “絶対に落ちない payload” を作る
  const thisMonthIncome = latest?.income ?? 0;
  const thisMonthExpense = latest?.expense ?? 0;
  const net = (latest?.income ?? 0) - (latest?.expense ?? 0);

  const overviewPayload: OverviewPayload = {
    ...(overviewFromAction ?? {}),
    cashAccountId: selectedAccountId,
    accountName: typeof overviewFromAction?.accountName === "string" ? overviewFromAction.accountName : currentAccount.name,
    currentBalance:
      typeof overviewFromAction?.currentBalance === "number"
        ? overviewFromAction.currentBalance
        : (currentAccount.current_balance ?? 0),
    thisMonthIncome:
      typeof overviewFromAction?.thisMonthIncome === "number" ? overviewFromAction.thisMonthIncome : thisMonthIncome,
    thisMonthExpense:
      typeof overviewFromAction?.thisMonthExpense === "number" ? overviewFromAction.thisMonthExpense : thisMonthExpense,
    net:
      typeof overviewFromAction?.net === "number" ? overviewFromAction.net : net,
  };

  const monthLabel = latest?.month ? String(latest.month).slice(0, 7) : null;
  const currentBalance = currentAccount.current_balance ?? null;

  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName: currentAccount.name ?? null,
    currentBalance,
    monthLabel,
    monthIncome: latest?.income ?? null,
    monthExpense: latest?.expense ?? null,
    monthNet: latest ? net : null,
    updatedAtISO: new Date().toISOString(),
  };

  const alertCards: AlertCard[] = [];
  if ((currentBalance ?? 0) <= 0) {
    alertCards.push({
      severity: "critical",
      title: "残高が危険水域です",
      description: "現在残高が 0 円以下です。支払い予定があるなら、資金ショートが現実的です。",
      actionLabel: "Simulationへ",
      href: `/simulation?cashAccountId=${selectedAccountId}`,
    });
  }

  return (
    <DashboardClient
      // ✅ ここが肝。searchParams が変わっても props が古いまま残る事故を潰す
      key={String(selectedAccountId)}
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
      cashStatus={cashStatus}
      alertCards={alertCards}
      overviewPayload={overviewPayload}
    />
  );
}