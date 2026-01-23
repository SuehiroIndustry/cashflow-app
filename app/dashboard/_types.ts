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

// 互換用（古いコンポーネントが MonthlyCashBalanceRow を参照してても落ちないように）
export type MonthlyCashBalanceRow = MonthlyBalanceRow;

// ===== Monthly income/expense (single month) =====
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

// ===== Overview =====
export type OverviewPayload = {
  accountName: string;
  currentBalance: number;

  // 当月
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number; // thisMonthIncome - thisMonthExpense

  month: string; // "YYYY-MM-01"
};

// ===== CashFlow (manual input) =====
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

export type CashFlowUpdateInput = {
  id: number;
  cashAccountId: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cashCategoryId: number | null;
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
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  cash_category_id: number | null;
  description: string | null;
  source_type: string;
};