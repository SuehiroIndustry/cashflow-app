// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

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
    cashAccountId?: string;
  };
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const rawAccounts = await getAccounts();

  // ✅ numeric が string で返ってきても必ず number にする
  const accounts: AccountRow[] = (rawAccounts ?? []).map((a: any) => ({
    id: Number(a.id),
    name: String(a.name ?? ""),
    current_balance: toNumber(a.current_balance, 0),
  }));

  // 口座が無いなら落とさない
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

  const currentAccount =
    accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

  // 月次（12ヶ月）
  const rawMonthly = await getMonthlyBalance({
    cashAccountId: selectedAccountId,
    months: 12,
  });

  // ✅ monthly も numeric/string 混在を正規化
  const monthlyDesc: MonthlyBalanceRow[] = (rawMonthly ?? []).map((r: any) => ({
    cash_account_id: r.cash_account_id ?? r.cashAccountId ?? selectedAccountId,
    month: String(r.month ?? ""),
    income: toNumber(r.income, 0),
    expense: toNumber(r.expense, 0),
    balance: toNumber(r.balance, 0),
  }));

  // monthly は desc で返ってくる想定なので、UI 用に昇順へ
  const monthlyAsc = [...monthlyDesc].reverse();
  const latest = monthlyAsc.length ? monthlyAsc[monthlyAsc.length - 1] : null;

  // getOverview は month 必須
  const monthForOverview = latest?.month ?? monthStartISO();

  const overviewFromAction = await getOverview({
    cashAccountId: selectedAccountId,
    month: monthForOverview,
  });

  // ✅ “正”は月次（ズレ防止）
  const thisMonthIncome = latest?.income ?? 0;
  const thisMonthExpense = latest?.expense ?? 0;
  const monthNet = thisMonthIncome - thisMonthExpense;

  // ✅ Overview は「選択口座の口座名/残高」を絶対正として上書き
  // ✅ ついでに number も正規化
  const overviewPayload: OverviewPayload = {
    ...(overviewFromAction ?? {}),
    cashAccountId: selectedAccountId,

    accountName: currentAccount.name ?? "-",
    currentBalance: toNumber(currentAccount.current_balance, 0),

    // ここは「月次」を正にする（楽天メール→月次直書き運用と整合）
    thisMonthIncome,
    thisMonthExpense,
    net: monthNet,
  };

  const monthLabel = latest?.month ? String(latest.month).slice(0, 7) : null;

  const cashStatus: CashStatus = {
    selectedAccountId,
    selectedAccountName: currentAccount.name ?? null,
    currentBalance: toNumber(currentAccount.current_balance, 0),
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
      key={String(selectedAccountId)}
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthlyAsc}
      cashStatus={cashStatus}
      alertCards={alertCards}
      overviewPayload={overviewPayload}
    />
  );
}