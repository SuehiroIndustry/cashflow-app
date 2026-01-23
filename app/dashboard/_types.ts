// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
  current_balance: number;
};

export type CashCategory = {
  id: number;
  name: string;
};

export type MonthlyIncomeExpenseRow = {
  month: string; // "YYYY-MM" or "YYYY-MM-01"
  income: number;
  expense: number;
  net: number;
};

export type MonthlyBalanceRow = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
};

export type OverviewPayload = {
  accountName: string;
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
};

export type CashShortForecastLevel = "safe" | "warn" | "danger";

export type CashShortForecast = {
  level: CashShortForecastLevel;
  message: string;

  month: string; // YYYY-MM-01
  rangeMonths: number;
  avgWindowMonths: number;

  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  shortDate: string | null; // YYYY-MM or null
};

export type CashShortForecastInput = {
  cashAccountId: number; // 0 = all accounts
  month: string; // YYYY-MM-01
  rangeMonths: number;
  avgWindowMonths: number;
};

/**
 * 一覧/テーブル用
 */
export type CashFlowListRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;

  cashAccountId: number;
  cashAccountName?: string;

  cashCategoryId: number | null;
  cashCategoryName?: string | null;

  description: string | null;
  sourceType: string; // "manual" など
};

export type CashFlowDeleteInput = {
  id: number;
  cashAccountId?: number;
};

/**
 * Simulation（将来推計）用 input
 * getCashProjection.ts の仕様に合わせる
 */
export type GetCashProjectionInput = {
  cashAccountId: number; // 0 = all accounts

  startDate: string; // YYYY-MM-DD or YYYY-MM-01
  days: number;

  // 互換（残しておく）
  month?: string; // YYYY-MM-01
  rangeMonths?: number;
};

export type CashProjectionPoint = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
  balance: number;
};

/**
 * 日次の推計行
 */
export type CashProjectionRow = {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  net: number;
  balance: number;
};

export type CashProjectionResult = {
  cashAccountId: number;

  startDate: string; // YYYY-MM-DD
  days: number;

  currentBalance: number;
  shortDate: string | null;

  rows: CashProjectionRow[];

  points?: CashProjectionPoint[];
  message?: string;
};