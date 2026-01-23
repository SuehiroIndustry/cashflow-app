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
 */
export type MonthlyIncomeExpenseRow = {
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  net: number;
};

// ===== Cash short forecast (monthly projection) =====
export type CashProjectionMonthRow = {
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export type CashShortForecastInput = {
  cashAccountId: number;
  month: string;
  rangeMonths: number;
  avgWindowMonths: number;
  whatIf?: {
    deltaIncome?: number;
    deltaExpense?: number;
  };
};

export type CashShortForecast = {
  cashAccountId: number;
  month: string;
  rangeMonths: number;
  avgWindowMonths: number;

  avgIncome: number;
  avgExpense: number;
  avgNet: number;
  level: "safe" | "warn" | "danger";
  message: string;

  shortDate: string | null;
  rows: CashProjectionMonthRow[];
};

// ===== Simulation (daily projection) =====
export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string;
  days: number;
};

export type CashProjectionDayRow = {
  date: string;
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
  shortDate: string | null;
  rows: CashProjectionDayRow[];
};

// ===== Overview（Dashboard summary）=====
export type OverviewPayload = {
  accountName: string;

  // 現在値
  currentBalance: number;

  // 当月サマリー
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
};

// ===== CashFlow =====
export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string;
  section: CashFlowSection;
  amount: number;
  cashCategoryId: number | null;
  description?: string | null;
  sourceType?: "manual";
};

export type CashFlowUpdateInput = {
  id: number;
  cashAccountId: number;

  date?: string;
  section?: CashFlowSection;
  amount?: number;
  cashCategoryId?: number | null;
  description?: string | null;
};

export type CashFlowDeleteInput = {
  id: number;
  cashAccountId: number;
};

// ===== Cash Categories =====
export type CashCategory = {
  id: number;
  name: string;
};

// ===== Cash Flows (list rows) =====
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string;
  section: "in" | "out";
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  source_type: string;
};