// app/dashboard/_types.ts

/**
 * このファイルからのみ型を import するルールで統一する。
 * （_actions 側から型を import しない）
 */

// ----------------------
// 基本エンティティ
// ----------------------

export type CashAccount = {
  id: number; // DB: bigint だけどフロントでは number 扱い（UI用途）
  name: string;
};

// monthly_cash_account_balances の「行」っぽい形（一覧・グラフ用）
export type MonthlyCashBalanceRow = {
  user_id?: string; // uuid（ビュー/テーブルによっては返らないことがあるので optional）
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
  updated_at?: string;
};

// 収入・支出だけ欲しいときの戻り値（getMonthlyIncomeExpense）
export type MonthlyIncomeExpenseRow = {
  income: number;
  expense: number;
};

// ----------------------
// Dashboard 表示用
// ----------------------

export type OverviewPayload = {
  accountName: string;

  currentBalance: number;

  thisMonthIncome: number;
  thisMonthExpense: number;

  net: number;

  // 画面に「月次残高」「前月比」を出してるので持たせる（必要なければ呼び出し側で 0 を入れる）
  monthBalance: number;
  momDelta: number; // month over month 差分
};

// ----------------------
// createCashFlow 用
// ----------------------

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;

  // manual のときは必須（DB制約に合わせる）
  cash_category_id?: number | null;

  description?: string | null;
};

// ----------------------
// 互換エイリアス（過去参照を壊さない）
// ----------------------

// 以前 `MonthlyBalanceRow` を参照してる箇所が残ってもビルド落ちしないようにする。
// （本当は参照側を全部 MonthlyCashBalanceRow に揃えるのが理想）
export type MonthlyBalanceRow = MonthlyCashBalanceRow;

// 以前 `AccountRow` を参照してる箇所が残ってもビルド落ちしないようにする。
export type AccountRow = CashAccount;