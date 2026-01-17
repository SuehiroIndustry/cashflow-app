export type CashAccount = {
  id: number;
  name: string;
};

// 旧コード互換（Vercelのエラー止め）
export type AccountRow = CashAccount;

export type MonthlyCashBalanceRow = {
  user_id: string;
  cash_account_id: number;
  month: string; // date のISO文字列: "2026-01-01"
  income: number;
  expense: number;
  balance: number;
  updated_at: string;
};

// 旧コード互換（Vercelのエラー止め）
export type MonthlyBalanceRow = MonthlyCashBalanceRow;

export type MonthAgg = {
  month: string; // "YYYY-MM"（表示用）
  balance: number;
  income: number;
  expense: number;
};