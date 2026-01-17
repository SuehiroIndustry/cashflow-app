"use server";

import { createClient } from "@/utils/supabase/server";

export type CashFlowRow = {
  id: number;
  date: string; // yyyy-mm-dd
  type: string; // "income" | "expense" など
  amount: number;
  description: string | null;
  cash_account_id: string;
  cash_category_id: string | null;
  source_type: string;
  created_at: string | null;
};

export async function getCashFlows(params: {
  cash_account_id: string;
  limit?: number;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      "id,date,type,amount,description,cash_account_id,cash_category_id,source_type,created_at"
    )
    .eq("cash_account_id", params.cash_account_id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(params.limit ?? 50);

  if (error) throw new Error(error.message);
  return data as CashFlowRow[];
}