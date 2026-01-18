// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
};

export type MonthlyCashBalanceRow = {
  // NOTE: ここは「Aで行く」の方針に合わせて cash_account_id は持たない前提
  // テーブル行そのものは client select で使うけど、UI側の key は month で足りる
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at: string | null;
};

export type MonthlyIncomeExpenseRow = {
  income: number;
  expense: number;
};

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  cash_category_id: number;
  description: string | null;
};

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
  monthlyBalance: number;
  monthlyDiff: number;
};

export type CashCategory = {
  id: number;
  name: string;
};