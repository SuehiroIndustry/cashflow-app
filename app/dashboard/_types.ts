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

  // 今月（monthly の最新月行）
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

// 将来用（未使用でもOK）
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
 * getCashProjection.ts が期待している形に合わせる
 * ========================= */

export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string; // ISO date string (e.g. "2026-01-01")
  days: number; // horizon in days
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
 * getCashShortForecast.ts が期待している input/output に合わせる
 * ========================= */

export type CashShortForecastInput = {
  cashAccountId: number;
  month: string; // new Date(input.month) されるので "YYYY-MM-01" 推奨
  rangeMonths?: number; // input.rangeMonths
  avgWindowMonths?: number; // input.avgWindowMonths
};

export type CashShortForecastRow = {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  net: number;
  projected_balance: number;
};

// ✅ getCashShortForecast.ts が "safe" を使ってるので、少なくとも safe は必須。
// 他はコード側で使ってる可能性が高いので、壊れにくいセットで定義。
export type CashShortForecastLevel = "safe" | "watch" | "danger" | "short";

export type CashShortForecast = {
  cashAccountId: number;

  month: string;
  rangeMonths: number;
  avgWindowMonths: number;

  // ✅ 今回のエラー原因：これが必要
  level: CashShortForecastLevel;

  rows: CashShortForecastRow[];

  // getCashShortForecast.ts 側が shortDate を使ってる可能性があるので両対応
  shortMonth?: string | null;
  shortDate?: string | null;

  currentBalance?: number;
  minBalance?: number;
};