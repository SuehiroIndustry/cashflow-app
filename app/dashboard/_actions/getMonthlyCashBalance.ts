// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyCashAccountBalanceRow } from "../_types";
import { ensureMonthlyCashBalance } from "./ensureMonthlyCashBalance";

export async function getMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyCashAccountBalanceRow> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // ここで「その月の行が必ずある」状態にしてから取りにいく
  await ensureMonthlyCashBalance({
    cash_account_id: args.cash_account_id,
    month: args.month,
  });

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance, updated_at")
    .eq("user_id", user.id)
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .single();

  if (error) throw error;

  return {
    cash_account_id: Number(data.cash_account_id),
    month: String(data.month),
    income: data.income ?? 0,
    expense: data.expense ?? 0,
    balance: data.balance ?? 0,
    updated_at: data.updated_at ?? null,
  };
}