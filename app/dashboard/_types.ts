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
  // cash_categories は user_id を持たない（あなたの前提）
  // 必要なら user_category_settings 側で制御
};

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  section: CashFlowSection;
  amount: number;
  cash_category_id: number; // manual の場合は必須（あなたの CHECK 制約前提）
  description?: string | null;
};

export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};

/**
 * cash_flows 一覧（join したカテゴリ名を表示する前提）
 * Supabase select: cash_category:cash_categories(id,name)
 */
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string;
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  created_at: string;

  cash_category: {
    id: number;
    name: string;
  } | null;
};

export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01
  balance: number;
  income: number;
  expense: number;
  updated_at?: string | null;
};

export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
};

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;
};