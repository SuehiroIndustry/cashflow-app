// app/dashboard/_types.ts

export type CashFlowSection = "in" | "out";

export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
};

export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  balance: number;
  income: number;
  expense: number;
};

export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
};

export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  created_at: string;

  // join (alias) 想定: cash_category:cash_categories(...)
  cash_category: { id: number; name: string } | null;
};

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number; // manual必須
  description?: string | null;

  // DB制約対策（source_type NOT NULL）
  source_type?: "manual";
};

export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;
};