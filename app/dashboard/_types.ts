// app/dashboard/_types.ts

// ===== Domain / DB-ish types (dashboard 内だけで使う想定) =====

export type CashAccount = {
  id: number;
  name: string;
};

export type MonthlyCashBalanceRow = {
  // monthly_cash_account_balances の1行を想定
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number | null;
  expense: number | null;
  balance: number | null;
  updated_at?: string | null;
};

export type MonthlyIncomeExpenseRow = {
  income: number;
  expense: number;
};

export type OverviewPayload = {
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  // 画面に「月次残高」「前月比」を出してるならこれ
  monthBalance: number;
  prevMonthBalance: number;
};

export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection; // "in" | "out"
  amount: number; // numeric
  cash_category_id: number | null; // manual の場合必須だが型としては null も許容
  description?: string | null;
};

// （必要なら）取引入力フォーム用の軽量Option型
export type SelectOption = {
  id: string;
  name: string;
};