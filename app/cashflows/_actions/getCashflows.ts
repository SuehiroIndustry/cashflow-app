"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashFlowRow } from "../_types";

export async function getCashflows(params: {
  cash_account_id: number;
  limit?: number;
}): Promise<CashFlowRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      "id,cash_account_id,date,type,amount,currency,source_type,cash_category_id,description"
    )
    .eq("cash_account_id", params.cash_account_id)
    .order("date", { ascending: false })
    .limit(params.limit ?? 200);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    amount: typeof r.amount === "string" ? Number(r.amount) : r.amount,
  }));
}