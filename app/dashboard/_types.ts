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
 * getCashFlows.ts が import している行型
 * （UI用の一覧表示に必要な最低限）
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