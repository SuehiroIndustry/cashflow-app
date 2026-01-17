export type CashFlowType = "income" | "expense" | string;

export type CashFlowRow = {
  id: number;
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  type: CashFlowType;
  amount: number; // numeric -> number として扱う
  currency: string | null;
  source_type: string;
  cash_category_id: number | null;
  description: string | null;
};

export type AccountOption = {
  id: number;
  name: string;
  kind?: string | null;
};

export type CategoryOption = {
  id: number;
  name: string;
};