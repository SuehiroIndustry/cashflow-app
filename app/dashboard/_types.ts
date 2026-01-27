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

/* =========================
 * Accounts / Monthly
 * ========================= */

export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

export type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

/* =========================
 * Categories
 * ========================= */

export type CashCategory = {
  id: number;
  name: string;
  kind?: string | null;
  sort_order?: number | null;
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
  cash_account_id: number;
  date: string; // ISO
  section: "収入" | "支出" | "income" | "expense";
  amount: number;
  memo?: string | null;
  cash_category_id?: number | null;
};

/* =========================
 * Cash Projection（Simulation系）
 * ========================= */

export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string; // ISO date string (e.g. "2026-01-01")
  days: number;
};

export type CashProjectionRow = {
  date: string; // ISO date
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
  month: string; // new Date(input.month) されるので "YYYY-MM-01" 推奨
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
  cashAccountId: number;

  message: string;

  month: string;
  rangeMonths: number;
  avgWindowMonths: number;

  // ✅ 追加（今回のエラー原因）
  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  level: CashShortForecastLevel;

  rows: CashShortForecastRow[];

  shortMonth?: string | null;
  shortDate?: string | null;

  currentBalance?: number;
  minBalance?: number;
};