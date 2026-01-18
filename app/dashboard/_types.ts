// app/dashboard/_types.ts

// 口座
export type CashAccount = {
  id: number;
  name: string;
};

// 月次スナップショット（monthly_cash_account_balances）
export type MonthlyCashBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
};

// 月次の収入・支出だけ欲しい時
export type MonthlyIncomeExpenseRow = {
  income: number | null;
  expense: number | null;
};

// cash_flows 登録用（server action createCashFlow に渡す形）
export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  cash_category_id: number; // manual の場合必須（DB制約）
  description: string | null;
};

// OverviewCard 用（画面表示に都合のいい形）
export type OverviewPayload = {
  currentBalance: number; // 現在残高
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number; // thisMonthIncome - thisMonthExpense
  monthBalance: number; // 月次残高（スナップショットのbalance）
  prevMonthDiff: number; // 当月balance - 前月balance
};