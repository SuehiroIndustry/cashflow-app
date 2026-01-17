// app/dashboard/_types.ts

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

// ✅ これを追加：古い命名（MonthlyBalanceRow）を新命名に合わせて吸収する
export type MonthlyBalanceRow = MonthlyCashBalanceRow;

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