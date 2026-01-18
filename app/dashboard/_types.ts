// app/dashboard/_types.ts

/** DBのIDは number に寄せる（UI側で扱いやすい） */
export type Id = number;

/** cash_accounts */
export type CashAccount = {
  id: Id;
  name: string;
};

/** cash_categories（※user_id は無い前提） */
export type CashCategory = {
  id: Id;
  name: string;
};

/** cash_flows section（UIもこれに合わせる） */
export type CashFlowSection = "in" | "out";

/** cash_flows insert 用 */
export type CashFlowCreateInput = {
  cash_account_id: Id;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: Id; // manual の場合必須
  description: string | null;
};

/**
 * monthly_cash_account_balances の行（一覧/チャート用）
 * - key に cash_account_id が必要なので必ず持つ
 * - user_id は UI 的に不要なので “持ってもいいが必須にしない”
 */
export type MonthlyCashBalanceRow = {
  cash_account_id: Id;
  month: string; // "YYYY-MM-01"（date文字列）
  income: number;
  expense: number;
  balance: number;
  updated_at: string | null;
  user_id?: string | null;
};

/**
 * 月の収入/支出（DashboardClient はこれだけ欲しい）
 * cash_account_id / month は “返さない” 方針に統一
 */
export type MonthlyIncomeExpense = {
  income: number;
  expense: number;
};

/** OverviewCard 用（表示に必要な最小） */
export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  monthlyBalance: number;
  monthlyDiff: number;
};