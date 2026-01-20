// app/dashboard/_types.ts

// ====== master / lookup ======
export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
  // 必要なら追加（例: sort_order, type など）
};

// ====== cash flows (UI / actions) ======
export type CashFlowSection = "income" | "expense";

/**
 * cash_flows テーブルを操作するための入力
 * - DBのカラムに合わせて snake_case に寄せる（迷子になりにくい）
 */
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;

  // manual のときカテゴリ必須の運用（DB CHECK制約がある想定）
  cash_category_id?: number | null;

  // cash_flows の NOT NULL: type を埋めるために使う（section を type に入れる運用なら不要でもOK）
  type?: string;

  description?: string | null;

  // たいてい manual 固定でOK
  source_type?: "manual" | string;
  source_id?: number | null;

  is_projection?: boolean;
  currency?: string;
};

export type CashFlowUpdateInput = {
  id: number;
  cash_account_id: number;

  // 更新可能なものを optional に
  date?: string; // "YYYY-MM-DD"
  section?: CashFlowSection;
  amount?: number;

  cash_category_id?: number | null;
  type?: string;
  description?: string | null;

  source_type?: "manual" | string;
  source_id?: number | null;

  is_projection?: boolean;
  currency?: string;
};

export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};

export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description: string | null;
};

// ====== monthly balances ======
/**
 * UI用（月次サマリ）
 * getMonthlyCashBalances の返り値はこれに合わせる
 */
export type MonthlyCashBalanceRow = {
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

/**
 * DB行そのままを使いたい場合（必要なら）
 * ※ DashboardClient では MonthlyCashBalanceRow を推奨
 */
export type MonthlyCashAccountBalanceRow = {
  user_id: string; // uuid
  cash_account_id: number;
  month: string; // date -> "YYYY-MM-DD" で受ける想定
  income: number;
  expense: number;
  balance: number;
  updated_at: string; // timestamptz -> ISO string
};

// 月次の「収入・支出」だけを返す用途（getMonthlyIncomeExpense.ts 用）
export type MonthlyIncomeExpenseRow = {
  month: string;   // "YYYY-MM-01"
  income: number;
  expense: number;
};

export type GetMonthlyCashBalancesInput = {
  cashAccountId: number;
  month: string; // "YYYY-MM-01"
  rangeMonths: number; // 例: 12
};

// ====== overview ======
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  // 必要なら追加（前月比など）
};