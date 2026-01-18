// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureMonthlyCashBalance } from "./_ensureMonthlyCashBalance";

export async function getMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<{ cash_account_id: number; month: string; balance: number }> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  await ensureMonthlyCashBalance({
    cash_account_id: args.cash_account_id,
    month: args.month,
  });

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, balance")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;

  return {
    cash_account_id: Number(data?.cash_account_id ?? args.cash_account_id),
    month: String(data?.month ?? args.month),
    balance: Number(data?.balance ?? 0),
  };
}