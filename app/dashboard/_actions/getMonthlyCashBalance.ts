// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyCashBalanceRow } from "../_types";

export async function getMonthlyCashBalance(input: {
  cash_account_id: number;
  month: string; // YYYY-MM-01
}): Promise<MonthlyCashBalanceRow | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("*")
    .eq("cash_account_id", input.cash_account_id)
    .eq("month", input.month)
    .single();

  if (error) {
    // データなしはエラーにしない
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}