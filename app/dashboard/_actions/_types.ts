// app/dashboard/_actions/_types.ts

export type CashFlowSection = "in" | "out";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description?: string | null;
  source_type?: "manual";
};

export type CashFlowDeleteInput = {
  id: number;
  cash_account_id: number;
};