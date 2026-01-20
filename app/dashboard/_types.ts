export type CashFlowSection = "収入" | "支出" | "income" | "expense";

export type CashFlowCreateInput = {
  cash_account_id: number;
  date: string; // "YYYY-MM-DD"
  section: CashFlowSection;
  amount: number;
  cash_category_id: number | null;
  description?: string | null;
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