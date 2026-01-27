// ===============================
// 共通基盤型（dashboard 配下の single source of truth）
// ===============================

/* ---------- Alerts / Dashboard ---------- */

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertCard = {
  severity: AlertSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
};

export type CashStatus = {
  selectedAccountId: number | null;
  selectedAccountName: string | null;
  currentBalance: number | null;

  monthLabel: string | null;
  monthIncome: number | null;
  monthExpense: number | null;
  monthNet: number | null;

  updatedAtISO: string;
};

/* ---------- Accounts ---------- */

export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

/* ---------- Monthly Balance ---------- */

export type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
  income: number;
  expense: number;
  balance: number;
};

/* ---------- Cash Categories ---------- */

export type CashCategory = {
  id: number;
  name: string;
  kind?: string | null;
  sort_order?: number | null;
  is_active?: boolean | null;
};

/* ---------- Cash Flows ---------- */

// 一覧取得用
export type CashFlowListRow = {
  id: number;
  cash_account_id: number;
  date: string; // ISO
  section: "収入" | "支出" | "income" | "expense";
  amount: number;
  memo?: string | null;
  cash_category_id?: number | null;
  cash_category_name?: string | null;
};

// 削除用
export type CashFlowDeleteInput = {
  id: number;
  cashAccountId: number;
};

/* ---------- 将来拡張用（未使用でもOK） ---------- */

// 作成・更新系が増えても、ここに足せば破綻しない
export type CashFlowUpsertInput = {
  id?: number;
  cash_account_id: number;
  date: string;
  section: "収入" | "支出" | "income" | "expense";
  amount: number;
  memo?: string | null;
  cash_category_id?: number | null;
};
/* ---------- Cash Projection / Simulation ---------- */

export type GetCashProjectionInput = {
  cashAccountId: number;
  startDate: string; // ISO date string (e.g. "2026-01-01")
  days: number;      // horizon in days
};

export type CashProjectionRow = {
  date: string; // ISO date string
  income: number;
  expense: number;
  net: number;      // income - expense
  balance: number;  // projected balance
};

export type CashProjectionResult = {
  cashAccountId: number;
  startDate: string;
  days: number;
  rows: CashProjectionRow[];
  shortDate?: string | null; // 途中でショートする日があるなら入る想定
  minBalance?: number;
};