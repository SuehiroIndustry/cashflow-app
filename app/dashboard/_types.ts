// app/dashboard/_types.ts

// --- Accounts ---
export type CashAccount = {
  id: number;
  name: string;
};

// getAccounts の戻りなどで使う場合
export type AccountRow = CashAccount;

// --- Monthly balances view/table row ---
export type MonthlyCashBalanceRow = {
  id: number;
  user_id: string;
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
};

// ★ 今回のエラーの原因：これが無かった（or 名前が違った）
export type MonthlyIncomeExpenseRow = {
  income: number;
  expense: number;
};

// --- Cash flow create input ---
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  cash_category_id: number;
  description?: string | null;
};