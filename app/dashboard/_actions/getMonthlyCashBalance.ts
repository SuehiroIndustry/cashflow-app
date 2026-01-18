// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureMonthlyCashBalance } from "./ensureMonthlyCashBalance";
import type { MonthlyCashBalanceRow } from "../_types";

export async function getMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyCashBalanceRow | null> {
  const supabase = await createSupabaseServerClient();

  // auth（RLS前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // 月次レコードが無ければ作る（既存方針）
  await ensureMonthlyCashBalance({
    cash_account_id: args.cash_account_id,
    month: args.month,
  });

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance, updated_at, user_id")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    cash_account_id: Number(data.cash_account_id),
    month: String(data.month),
    income: Number(data.income ?? 0),
    expense: Number(data.expense ?? 0),
    balance: Number(data.balance ?? 0),
    updated_at: data.updated_at ?? null,
    user_id: (data as any).user_id ?? null,
  };
}