// app/dashboard/_types.ts

export type CashFlowSection = "in" | "out";

/** accounts */
export type CashAccount = {
  id: number;
  name: string;
};

/** categories */
export type CashCategory = {
  id: number;
  name: string;
};

/** monthly balances (table: monthly_cash_account_balances) */
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
  user_id?: string | null;
};

/** server action: income/expense for a month */
export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
};

/** create cash flow input */
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number; // manual 必須運用
  description: string | null;
};

/** delete cash flow input */
export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};

/** cash flow list row (for "当月の明細") */
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // "YYYY-MM-DD" (or timestamp string)
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  created_at: string;

  // join result (alias)
  cash_category: { id: number; name: string } | null;
};

/** OverviewCard 用 */
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;
};