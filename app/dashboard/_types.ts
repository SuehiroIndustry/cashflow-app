// app/dashboard/_types.ts

export type CashFlowSection = "in" | "out";

// --- master ---
export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
};

// --- monthly snapshot row (monthly_cash_account_balances) ---
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
  user_id?: string | null; // select で取る場合があるので optional
};

// --- getMonthlyIncomeExpense の戻り ---
export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
};

// --- cash_flows create ---
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number; // manual 必須（現状ルール）
  description: string | null;
};

// --- cash_flows list row (getCashFlows の戻り) ---
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  created_at?: string | null;

  // join で cash_categories を取る想定
  cash_category?: { id: number; name: string } | null;
};

// --- overview card payload (OverviewCard.tsx が参照) ---
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;
};

export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};