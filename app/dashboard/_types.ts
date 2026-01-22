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

// ===== Cash Flow Create (manual entry) =====
// createCashFlow.ts が import している型
export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  cashCategoryId: number;
  description?: string | null;
  sourceType: "manual";
};

// ===== Overview（未実装でもOK用）=====
export type OverviewPayload = {
  note?: string;
};