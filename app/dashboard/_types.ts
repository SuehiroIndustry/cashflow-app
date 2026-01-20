// app/dashboard/_types.ts

// =====================
// 基本ドメイン型
// =====================

// 口座（cash_accounts）
export type CashAccount = {
  id: number;
  name: string;

  // もしテーブルにあるなら使う（無くてもOK）
  type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// カテゴリ（cash_categories / user_category_settings 経由など）
// ※カテゴリは user_id 列が無い前提（あなたのルール通り）
export type CashCategory = {
  id: number;
  name: string;

  // 収入/支出の区分（DBに合わせて調整してOK）
  section?: "収入" | "支出" | "income" | "expense" | string;
  sort_order?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
};

// =====================
// Cash Flow 入出金
// =====================

export type CashFlowSection = "収入" | "支出" | "income" | "expense";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;

  cash_category_id: number | null;
  description?: string | null;

  // DB制約に合わせた運用
  source_type?: "manual" | string;
  source_id?: number | null;

  is_projection?: boolean;
};

export type CashFlowUpdateInput = {
  id: number;
  cash_account_id: number;
  date: string;
  section: CashFlowSection;
  amount: number;

  cash_category_id: number | null;
  description?: string | null;

  is_projection?: boolean;
};

// 一覧表示に使う行（Dashboardの「当月の明細」など）
export type CashFlowListRow = {
  id: number;
  date: string; // "YYYY-MM-DD"
  section: string;
  amount: number;
  cash_category_id: number | null;
  category_name: string | null;
  memo: string | null;
};

// 月次集計表示
export type MonthlyBalanceRow = {
  month: string; // "YYYY-MM-01" 等
  income: number;
  expense: number;
  balance: number;
};

// Overview 表示用
export type OverviewPayload = {
  accountId: number;
  accountName: string;

  currentBalance: number;

  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;

  monthEndBalance?: number;
  monthOverMonth?: number;
};