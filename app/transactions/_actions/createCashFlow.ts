"use server";

import { createClient } from "@/utils/supabase/server";

export async function createCashFlow(input: {
  cash_account_id: string;
  date: string; // yyyy-mm-dd
  type: "income" | "expense";
  amount: number;
  description?: string;
  source_type?: "manual";
  cash_category_id?: string | null;
}) {
  const supabase = await createClient();

  const payload = {
    cash_account_id: input.cash_account_id,
    date: input.date,
    type: input.type,
    amount: input.amount,
    description: input.description ?? null,
    source_type: input.source_type ?? "manual",
    cash_category_id: input.cash_category_id ?? null,
  };

  const { error } = await supabase.from("cash_flows").insert(payload);
  if (error) throw new Error(error.message);

  return { ok: true };
}