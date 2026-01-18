// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyIncomeExpense } from "../_types";
import { ensureMonthlyCashBalance } from "./ensureMonthlyCashBalance";

export async function getMonthlyIncomeExpense(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<MonthlyIncomeExpense> {
  const supabase = await createSupabaseServerClient();

  // auth（ルールに合わせて一応チェック）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // 月次レコードが無ければ作る（既存方針に合わせる）
  await ensureMonthlyCashBalance({
    cash_account_id: args.cash_account_id,
    month: args.month,
  });

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("income, expense")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (error) throw error;

  return {
    income: Number(data?.income ?? 0),
    expense: Number(data?.expense ?? 0),
  };
}