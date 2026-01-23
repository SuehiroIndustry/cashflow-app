// app/transactions/_types.ts

export type Option = { id: number; name: string };

export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  cashCategoryId: number; // manual は必須
  description?: string | null;
  sourceType?: "manual"; // 今は manual 固定運用
};

export type TransactionRow = {
  id: string;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  categoryName: string | null;
  description: string | null;
 설명?: never; // 変なキー混入防止（任意）
};