// app/dashboard/_types.ts

// ===== Accounts =====
export type CashAccount = {
  id: number;
  name: string;
  current_balance: number;
};

// ===== Monthly balances (actuals) =====
export type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

/**
 * Monthly income / expense aggregation
 * （月次の収支サマリー：一覧・チャート用）
 */
export type MonthlyIncomeExpenseRow = {
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  net: number; // income - expense
};

// ===== Cash short forecast (monthly projection) =====
export type CashProjectionMonthRow = {
  month: string; // "YYYY-MM-01"
  income: number; // avg income
  expense: number; // avg expense
  balance: number; // projected balance
};

export type CashShortForecastInput = {
  cashAccountId: number;
  month: string; // "YYYY-MM-01"
  rangeMonths: number; // 3/6/12 ...
  avgWindowMonths: number; // 3/6/12 ...
  whatIf?: {
    deltaIncome?: number; // + per month
    deltaExpense?: number; // + per month
  };
};

export type CashShortForecast = {
  cashAccountId: number;

  // request echo
  month: string; // "YYYY-MM-01"
  rangeMonths: number;
  avgWindowMonths: number;

  // computed
  avgIncome: number;
  avgExpense: number;
  avgNet: number; // avgIncome - avgExpense (after what-if)
  level: "safe" | "warn" | "danger";
  message: string;

  // first month where balance <= 0 (YYYY-MM-01) or null
  shortDate: string | null;

  rows: CashProjectionMonthRow[];
};

// ===== Simulation (daily projection) =====
export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string; // "YYYY-MM-DD"
  days: number; // e.g. 180
};

export type CashProjectionDayRow = {
  date: string; // "YYYY-MM-DD"
  income: number;
  expense: number;
  net: number;
  balance: number;
};

export type CashProjectionResult = {
  cashAccountId: number;
  startDate: string;
  days: number;
  currentBalance: number;
  shortDate: string | null; // first day where balance <= 0
  rows: CashProjectionDayRow[];
};

// ===== Overview（未実装でもOK用）=====
export type OverviewPayload = {
  note?: string;
};

// ===== CashFlow (manual input) =====
// DB: cash_flows
// - cash_account_id (number, NOT NULL)
// - cash_category_id (number, manualなら必須運用)
// - source_type (NOT NULL) -> "manual" を基本
// - section: "in" | "out" を想定
export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection; // "in" | "out"
  amount: number;
  cashCategoryId: number | null;
  description?: string | null;
  sourceType?: "manual";
};

// ===== CashFlow (update) =====
export type CashFlowUpdateInput = {
  id: number;                 // 更新対象の cash_flows.id
  cashAccountId: number;      // セキュリティ用（where 条件）

  date?: string;              // "YYYY-MM-DD"
  section?: "in" | "out";
  amount?: number;
  cashCategoryId?: number | null;
  description?: string | null;
};

export type CashFlowDeleteInput = {
  id: number;
  cashAccountId: number;
};

// ===== Cash Categories =====
// DB: public.cash_categories（user_id列は無い）
// このアクションでは id/name しか使わないので、まずは最小でOK
export type CashCategory = {
  id: number;
  name: string;
};

// ===== Cash Flows (list rows) =====
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out"; // DBのCHECKに合わせる
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  source_type: string; // "manual" など（今はstringでOK）
};