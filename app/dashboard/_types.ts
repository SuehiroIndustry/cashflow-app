// app/dashboard/_types.ts

/**
 * Dashboard 周りで使う型はここに集約する。
 * （DashboardClient.tsx などはここからだけ import する運用）
 */

// ========== master data ==========
export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
};

// ========== monthly_cash_account_balances ==========
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
  updated_at: string | null;
};

/**
 * 以前の命名が残っている箇所があっても落ちないように互換 alias
 */
export type MonthlyCashAccountBalanceRow = MonthlyCashBalanceRow;

// ========== dashboard summary payload ==========
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  monthlyBalance: number;
  monthlyDiff: number;
};

// ========== create cashflow (manual) ==========
/**
 * 画面側（DashboardClient.tsx）が "in" | "out" を使ってるので、それに合わせる。
 */
export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number; // manual は必須
  description: string | null;
};