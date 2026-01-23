// app/dashboard/_types.ts

export type CashAccount = {
  id: number;
  name: string;
  current_balance: number;
};

export type CashCategory = {
  id: number;
  name: string;
};

export type MonthlyBalanceRow = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  balance: number;
};

export type OverviewPayload = {
  accountName: string;
  currentBalance: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  net: number;
};

export type CashShortForecastLevel = "safe" | "warn" | "danger";

export type CashShortForecast = {
  level: CashShortForecastLevel;
  message: string;

  month: string; // YYYY-MM-01
  rangeMonths: number;
  avgWindowMonths: number;

  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  shortDate: string | null; // YYYY-MM or null
};

export type CashShortForecastInput = {
  cashAccountId: number; // 0 = all accounts
  month: string; // YYYY-MM-01
  rangeMonths: number;
  avgWindowMonths: number;
};

/**
 * getCashFlows.ts が import している行型（一覧/テーブル用）
 */
export type CashFlowListRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;

  cashAccountId: number;
  cashAccountName?: string;

  cashCategoryId: number | null;
  cashCategoryName?: string | null;

  description: string | null;
  sourceType: string; // "manual" など
};

export type CashFlowDeleteInput = {
  id: number;
  cashAccountId?: number;
};

/**
 * Simulation（将来推計）用
 * getCashProjection.ts が期待している input に合わせる
 */
export type GetCashProjectionInput = {
  cashAccountId: number; // 0 = all accounts

  // ✅ 現行 getCashProjection.ts 仕様
  startDate: string; // YYYY-MM-DD or YYYY-MM-01
  days: number;

  // ✅ 互換（残しておく）
  month?: string; // YYYY-MM-01
  rangeMonths?: number;
};

export type CashProjectionPoint = {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
  balance: number;
};

/**
 * ✅ getCashProjection.ts が作っている “日次” の結果（rows）
 * - getCashProjection.ts 内で CashProjectionResult["rows"] を参照してるので必須
 */
export type CashProjectionRow = {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  net: number;
  balance: number;
};

export type CashProjectionResult = {
  cashAccountId: number;

  startDate: string; // YYYY-MM-DD
  days: number;

  // ✅ 日次（画面の折れ線・一覧で使う想定）
  rows: CashProjectionRow[];

  // ✅ 月次サマリ（あれば使う）
  points?: CashProjectionPoint[];

  // 任意の補助情報
  shortMonth?: string | null; // YYYY-MM or null
  message?: string;
};