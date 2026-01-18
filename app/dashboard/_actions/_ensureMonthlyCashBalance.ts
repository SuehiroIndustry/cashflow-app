// app/dashboard/_actions/_ensureMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * monthly_cash_account_balances に該当月の行が無ければ作る
 * （RLS 前提：呼び出し元で auth check 済み想定）
 */
export async function ensureMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;
  if (data) return;

  const { error: insErr } = await supabase
    .from("monthly_cash_account_balances")
    .insert({
      cash_account_id: args.cash_account_id,
      month: args.month,
      income: 0,
      expense: 0,
      balance: 0,
    });

  if (insErr) throw insErr;
}