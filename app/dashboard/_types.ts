// app/dashboard/_types.ts
export type CashAccount = {
  id: number;
  name: string;
  current_balance: number;
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
  rangeMonths: number; // ex) 12
  avgWindowMonths: number; // ex) 6
};