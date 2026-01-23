// app/transactions/_types.ts

export type Section = "in" | "out";

/**
 * createCashFlow に渡す入力（Transactions側の正）
 * - sourceType は "manual" 固定（あなたのDB制約に合わせる）
 */
export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // YYYY-MM-DD
  section: Section;
  amount: number;
  cashCategoryId: number;
  description: string | null;
  sourceType?: "manual";
};

export type Option = { id: number; name: string };

export type TransactionRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: Section;
  amount: number;
  categoryName?: string | null;
  description?: string | null;
  createdAt?: string | null;
};