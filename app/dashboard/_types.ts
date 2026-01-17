// app/dashboard/_types.ts

// DBから返る「口座行」想定（必要なら後で列増やせばOK）
export type AccountRow = {
  id: number;
  name: string;
};

export type CashAccount = {
  id: number;
  name: string;
};

export type MonthlyCashBalanceRow = {
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

export type MonthAgg = {
  month: string; // "YYYY-MM"
  income: number;
  expense: number;
  balance: number;
};

export type OverviewPayload = {
  currentBalance: number;
  monthIncome: number;
  monthExpense: number;
  net: number;
};