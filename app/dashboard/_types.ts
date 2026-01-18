// app/dashboard/_types.ts

/** 入出金区分 */
export type CashFlowSection = "in" | "out";

/** 口座 */
export type CashAccount = {
  id: number;
  name: string;
  created_at?: string | null;
};

/** カテゴリ（cash_categories） */
export type CashCategory = {
  id: number;
  name: string;
  created_at?: string | null;
};

/** 月次スナップショット（monthly_cash_account_balances） */
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;

  // テーブルにあっても、client側では使わないことが多いので optional にしとく
  user_id?: string | null;
};

/** 月次の収入・支出（getMonthlyIncomeExpense の返り値） */
export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
};

/** cash_flows 作成入力 */
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection; // "in" | "out"
  amount: number;
  cash_category_id: number; // manual 前提で必須
  description: string | null;
};

/** cash_flows 一覧表示用（getCashFlows の返り値） */
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  created_at?: string | null;

  // join して取る想定（cash_categories）
  cash_category?: { id: number; name: string } | null;

  // 古いUI互換（必要なら使える）
  cash_category_name?: string | null;
};

/** deleteCashFlow の入力 */
export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};

/** OverviewCard 用の payload（コンポーネント側が参照してるキーに合わせる） */
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  monthlyBalance: number;
  monthlyDiff: number;
};