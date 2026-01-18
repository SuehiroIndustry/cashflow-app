// app/dashboard/_types.ts

// ========== domain basics ==========

export type CashAccount = {
  id: number;
  name: string;
};

export type CashCategory = {
  id: number;
  name: string;
};

// cash_flows.section に合わせる（UIも server action もここに寄せる）
export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  section: CashFlowSection;
  amount: number;

  // manual の場合必須（DB制約）
  cash_category_id: number;

  description: string | null;
};

// ========== monthly snapshots ==========
// monthly_cash_account_balances の “行” を表現。
// クエリによって select する列が違うので、user_id は optional にして吸収する。
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01 (date文字列)
  income: number;
  expense: number;
  balance: number;
  updated_at: string | null;

  // DashboardClient の client-select では user_id も取っているケースがある
  user_id?: string | null;
};

// getMonthlyIncomeExpense が返す形
export type MonthlyIncomeExpenseRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
};

// ========== UI payloads ==========

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthlyBalance: number;
  monthlyDiff: number;
};