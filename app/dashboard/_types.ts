// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
};

export type MonthlyCashBalanceRow = {
  user_id: string;
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
};

export type MonthlyAgg = {
  income: number;
  expense: number;
};

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  cash_category_id: number; // source_type='manual' のとき必須
  description?: string | null;
};

export type OverviewPayload = {
  currentBalance: number;
  monthIncome: number;
  monthExpense: number;
  net: number;
};