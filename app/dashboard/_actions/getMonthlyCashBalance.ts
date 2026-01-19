// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyCashBalanceRow } from "../_types";

function normalizeMonthKey(month: string): string {
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month;
  throw new Error("Invalid month format");
}

export async function getMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
}): Promise<MonthlyCashBalanceRow | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const monthKey = normalizeMonthKey(args.month);

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance, updated_at, user_id")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", monthKey)
    .maybeSingle();

  if (error) throw error;

  return (data ?? null) as MonthlyCashBalanceRow | null;
}