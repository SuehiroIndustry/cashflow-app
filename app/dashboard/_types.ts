// app/dashboard/_types.ts
// dashboard 配下の single source of truth（actions / client が参照する共通型）

/* =========================
 * Dashboard (UI)
 * ========================= */

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

  monthLabel: string | null; // "YYYY-MM"
  monthIncome: number | null;
  monthExpense: number | null;
  monthNet: number | null;

  updatedAtISO: string;
};

export type OverviewPayload = {
  cashAccountId?: number;
  accountName: string;
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  [key: string]: unknown;
};

/* =========================
 * Accounts / Monthly
 * ========================= */

export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

// ✅ simulation-client.tsx が import してる名前に合わせる
export type CashAccount = AccountRow;
// ✅ 念のため別名も用意（揺れ対策）
export type CashAccountRow = AccountRow;

export type MonthlyBalanceRow = {
  cash_account_id?: number;
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export type MonthlyIncomeExpenseRow = {
  month: string;
  income: number;
  expense: number;
  net: number;
};

/* =========================
 * Categories
 * ========================= */

export type CashCategory = {
  id: number;
  name: string;
  kind?: string | null;
  sort_order?: string | number | null;
  is_active?: boolean | null;
};

/* =========================
 * Cash Flows
 * ========================= */

export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // ISO
  section: "収入" | "支出" | "income" | "expense";
  amount: number;
  memo?: string | null;
  cash_category_id?: number | null;
  cash_category_name?: string | null;
};

export type CashFlowDeleteInput = {
  id: number;
  cashAccountId: number;
};

export type CashFlowUpsertInput = {
  id?: number;

  // DB列名に合わせた snake_case
  cash_account_id: number;
  cash_category_id?: number | null;

  date: string; // ISO
  section: "収入" | "支出" | "income" | "expense";
  amount: number;

  memo?: string | null;

  // camelCase 別名（互換用）
  cashAccountId?: number;
  cashCategoryId?: number | null;
  description?: string | null;
};

export type CashFlowUpdateInput = CashFlowUpsertInput;

/* =========================
 * Cash Projection（Simulation系）
 * ========================= */

export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string;
  days: number;
};

export type CashProjectionRow = {
  date: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
};

export type CashProjectionResult = {
  cashAccountId: number;
  startDate: string;
  days: number;

  currentBalance: number;

  rows: CashProjectionRow[];

  shortDate?: string | null;
  minBalance?: number;
};

/* =========================
 * Cash Short Forecast
 * ========================= */

export type CashShortForecastInput = {
  cashAccountId: number;
  month: string;
  rangeMonths?: number;
  avgWindowMonths?: number;
};

export type CashShortForecastRow = {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  net: number;
  projected_balance: number;
};

export type CashShortForecastLevel = "safe" | "warn" | "danger" | "short";

export type CashShortForecast = {
  level: CashShortForecastLevel;
  message: string;

  month: string;
  rangeMonths: number;
  avgWindowMonths: number;

  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  shortDate: string | null;

  cashAccountId?: number;
  rows?: CashShortForecastRow[];

  shortMonth?: string | null;
  currentBalance?: number;
  minBalance?: number;
};