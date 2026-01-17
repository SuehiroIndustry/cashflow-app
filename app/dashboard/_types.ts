// app/dashboard/_types.ts

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

// ✅ OverviewCard が参照してる型（これが無くてビルドが落ちてた）
export type OverviewPayload = {
  currentBalance: number;
  monthIncome: number;
  monthExpense: number;
  net: number;
};