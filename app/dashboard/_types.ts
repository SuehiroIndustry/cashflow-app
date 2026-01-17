// app/dashboard/_types.ts

// DB: public.cash_accounts
export type AccountRow = {
  id: number;      // bigint を number 扱い（JS側）
  name: string;
  currency?: string | null;
  initial_balance?: number | null;
  created_at?: string;
  user_id?: string;
};

// UIで使う軽量型（必要なら）
export type CashAccount = {
  id: number;
  name: string;
};

// DB: public.monthly_cash_account_balances
export type MonthlyCashBalanceRow = {
  month: string;   // "YYYY-MM-DD" (date)
  income: number;
  expense: number;
  balance: number;

  user_id?: string;
  cash_account_id?: number;
  updated_at?: string;
};

// チャート用集計
export type MonthAgg = {
  month: string; // "YYYY-MM"
  balance: number;
  income: number;
  expense: number;
};