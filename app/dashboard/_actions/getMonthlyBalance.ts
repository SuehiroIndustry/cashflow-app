"use server";

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export type MonthlyBalanceRow = {
  month: string;   // '2026-01-01' のようなISO文字列で返る想定
  income: number;
  expense: number;
  balance: number;
};

export async function getMonthlyBalance(accountId: string): Promise<MonthlyBalanceRow[]> {
  if (!accountId) return [];

  const supabase = createServerComponentClient({ cookies });

  const { data, error } = await supabase
    .from("monthly_account_balances")
    .select("month, income, expense, balance")
    .eq("account_id", accountId)
    .order("month", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[getMonthlyBalance] error:", error.message);
    return [];
  }

  return (data ?? []) as MonthlyBalanceRow[];
}