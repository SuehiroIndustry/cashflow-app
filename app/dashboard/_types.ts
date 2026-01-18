// app/dashboard/_types.ts

// =====================
// Cash Accounts
// =====================
export type CashAccount = {
  id: number;
  name: string;
};

// =====================
// Monthly Cash Balance
// （monthly_cash_account_balances テーブル / view）
// =====================
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
  balance: number;
};

// =====================
// Overview（ダッシュボード上部カード用）
// =====================
export type OverviewData = {
  accountName: string;
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  prevMonthBalance: number;
};

// =====================
// Monthly Income / Expense（server action戻り値）
// =====================
export type MonthlyIncomeExpenseRow = {
  income: number;
  expense: number;
};

// =====================
// Cash Flow Create（transaction form → server action）
// =====================
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  cash_category_id: number;
  description?: string | null;
};