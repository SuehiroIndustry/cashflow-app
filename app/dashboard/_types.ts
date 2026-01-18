// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
};

/**
 * グラフ/表用（口座IDなしの月次サマリ）
 */
export type MonthlyCashBalanceRow = {
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

/**
 * DB行に近い形（口座IDあり）
 */
export type MonthlyCashAccountBalanceRow = MonthlyCashBalanceRow & {
  cash_account_id: number;
  updated_at: string | null;
};

export type MonthlyIncomeExpenseRow = {
  income: number;
  expense: number;
};

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;

  // manual の場合は必須（DB CHECK）
  cash_category_id: number;

  description?: string | null;
};

/**
 * OverviewCard が参照しているキーに合わせた payload
 */
export type OverviewPayload = {
  currentBalance: number;

  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;

  // もし別の箇所で旧名を参照してても壊れないように残す（任意）
  monthIncome?: number;
  monthExpense?: number;
  prevMonthBalance?: number;
  accountName?: string;
};