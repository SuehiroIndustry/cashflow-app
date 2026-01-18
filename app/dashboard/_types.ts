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

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  section: CashFlowSection; // "in" | "out"
  amount: number;
  cash_category_id: number | null; // manual の場合は必須だが、UI都合で null 許容（バリデーション側で弾く）
  description: string | null;
};

export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
  balance: number;
  updated_at: string | null;
};

export type MonthlyIncomeExpense = {
  income: number;
  expense: number;
};

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  // 画面の「月次残高」「前月比」用（DashboardClient/OverviewCard が参照）
  monthlyBalance: number;
  monthlyDiff: number;
};