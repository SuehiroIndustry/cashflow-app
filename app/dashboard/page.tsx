// app/dashboard/page.tsx
import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import DashboardClient from "./DashboardClient";

import type {
  AccountRow,
  CashStatus,
  OverviewPayload,
  MonthlyBalanceRow,
  AlertCard,
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

// "YYYY-MM-01" を返す
function monthStartISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const accounts = await getAccounts();

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
        severity: "warning",
        title: "口座が未登録です",
        description: "cash_accounts に口座を追加してください。",
      },
    ];

    return (
      <DashboardClient
        accounts={[]}
        selectedAccountId={null}
        monthly={[]}
        overviewPayload={null}
        cashStatus={cashStatus}
        alertCards={alertCards}
      />
    );
  }

  const requestedId = toInt(searchParams?.cashAccountId);
  const selectedId = accounts.some((a) => a.id === requestedId)
    ? (requestedId as number)
    : accounts[0].id;

  const currentAccount: AccountRow =
    accounts.find((a) => a.id === selectedId) ?? accounts[0];

  // ✅ getOverview が month 必須なので必ず渡す
  // getOverview 側の期待が "YYYY-MM-01" / date 型どっちでも崩れにくいのはこれ
  const month = monthStartISO(new Date());

  const overviewPayload: OverviewPayload | null = await getOverview({
    cashAccountId: currentAccount.id,
    month, // ★追加
  });

  const monthly: MonthlyBalanceRow[] = await getMonthlyBalance({
    cashAccountId: currentAccount.id,
    months: 12,
  });

  const latest = monthly.length ? monthly[monthly.length - 1] : null;
  const monthLabel = latest?.month ? String(latest.month).slice(0, 7) : null;

  const cashStatus: CashStatus = {
    selectedAccountId: currentAccount.id,
    selectedAccountName: currentAccount.name ?? null,
    currentBalance:
      typeof currentAccount.current_balance === "number"
        ? currentAccount.current_balance
        : null,

    monthLabel,
    monthIncome: latest ? latest.income : null,
    monthExpense: latest ? latest.expense : null,
    monthNet: latest ? latest.income - latest.expense : null,

    updatedAtISO: new Date().toISOString(),
  };

  const alertCards: AlertCard[] = [];
  const bal =
    typeof cashStatus.currentBalance === "number" ? cashStatus.currentBalance : 0;

  if (bal <= 0) {
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
      selectedAccountId={currentAccount.id}
      monthly={monthly}
      overviewPayload={overviewPayload}
      cashStatus={cashStatus}
      alertCards={alertCards}
    />
  );
}