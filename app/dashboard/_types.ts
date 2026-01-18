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
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at: string | null;

  // client側で select に入れてるなら許容（RLS確認などに使う）
  user_id?: string | null;
};

export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
};

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number;
  description: string | null;
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

  // joinしたカテゴリ（無い/NULLもあり得る）
  cash_category: CashCategory | null;
};

/**
 * 既存コンポーネントが使う可能性があるので残しておく（不要なら後で削ってOK）
 */
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  monthlyBalance: number;
  monthlyDiff: number;
};