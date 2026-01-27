// app/dashboard/_types.ts
export type AlertSeverity = "critical" | "warning" | "info";

export type AlertCard = {
  severity: AlertSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
};

export type CashStatus = {
  selectedAccountId: number | null;
  selectedAccountName: string | null;
  currentBalance: number | null;

  // 今月（= monthlyの最新月行）
  monthLabel: string | null; // 例: "2026-01"
  monthIncome: number | null;
  monthExpense: number | null;
  monthNet: number | null;

  updatedAtISO: string; // サーバー生成
};

// DashboardClient で必要な “最低限の形” を固定する。
export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

export type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string; // 例: "2026-01-01" or "2026-01"
  income: number;
  expense: number;
  balance: number;
};

export type CashFlowDeleteInput = {
  id: number;
  cashAccountId: number;
};

export type CashCategory = {
  id: number;
  name: string;
  // DBによっては null あり得るので広めにしておく（型で詰まってビルド落とすのが一番ダルい）
  kind?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};