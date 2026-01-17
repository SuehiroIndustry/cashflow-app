// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
};

export type MonthlyCashBalanceRow = {
  // DBは date 型なので supabase は "YYYY-MM-DD" 文字列で返す想定
  month: string; // e.g. "2026-01-01"
  income: number;
  expense: number;
  balance: number;

  // あっても困らない（selectに含めないなら来ない）
  user_id?: string;
  cash_account_id?: number;
  updated_at?: string;
};

export type MonthAgg = {
  month: string; // "YYYY-MM"
  balance: number;
  income: number;
  expense: number;
};