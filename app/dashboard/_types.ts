// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
};

export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection; // "in" | "out"
  amount: number;
  cash_category_id: number | null;
  description?: string | null;
  source_type?: "manual";
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
  amount: number | null;
  cash_category_id: number | null;
  description: string | null;
  created_at: string | null;
  cash_category: { id: number; name: string } | null;
};

export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
  user_id?: string | null;
};

/**
 * ✅ ここがポイント：month を必須にする（= 今のビルドエラーの期待に合わせる）
 */
export type MonthlyIncomeExpenseRow = {
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
};

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;
};

export type CashFlowUpdateInput = {
  id: number;
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  section: CashFlowSection;
  amount: number;
  cash_category_id: number;
  description: string | null;
};

// app/dashboard/_types.ts

export type GetMonthlyCashBalancesInput = {
  cashAccountId: number;
  month: string;       // "YYYY-MM-01"
  rangeMonths: number; // 12とか
};

export type MonthlyCashAccountBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

// app/dashboard/_types.ts（追記分だけ）

export type GetCashShortForecastInput = {
  cashAccountId: number;
  month: string;       // "YYYY-MM-01"
  rangeMonths: number; // 2,6,12,24...
};

export type CashShortForecast = {
  cashAccountId: number;
  month: string;
  rangeMonths: number;

  currentBalance: number;
  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  monthsToZero: number | null;      // null=減らない/横ばい、0=すでに0以下
  predictedMonth: string | null;    // "YYYY-MM-01"

  level: "safe" | "warn" | "danger";
  message: string;
};

export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string;   // "YYYY-MM-DD"
  days: number;        // 例: 180
};

export type CashProjectionRow = {
  date: string;        // "YYYY-MM-DD"
  income: number;
  expense: number;
  net: number;
  balance: number;     // その日時点の残高
};

export type CashProjectionResult = {
  cashAccountId: number;
  startDate: string;
  days: number;
  currentBalance: number;
  shortDate: string | null;     // 残高<=0になった最初の日
  rows: CashProjectionRow[];
};