// app/transactions/_types.ts
export type Option = { id: number; name: string };

export type CashFlowSection = "in" | "out";
export type CashFlowSourceType = "manual";

export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // YYYY-MM-DD
  section: CashFlowSection;
  amount: number;
  cashCategoryId: number;
  description: string | null;
  sourceType?: CashFlowSourceType; // default "manual"
};

export type RecentCashFlowRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: CashFlowSection;
  amount: number;
  categoryName: string; // ←ここが分離ポイント
  description: string | null;
};