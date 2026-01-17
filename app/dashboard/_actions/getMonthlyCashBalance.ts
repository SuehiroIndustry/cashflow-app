"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MonthlyCashBalanceRow = {
  // Supabaseは date を string(ISO) で返すことが多い
  // 例: "2026-01-01"
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export async function getMonthlyCashBalance(cashAccountId: number) {
  const supabase = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");

  // monthly_cash_account_balances が VIEW の場合、
  // view側で auth.uid() フィルタしていることが多いので user_id 条件は付けない（0行事故を防ぐ）
  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("cash_account_id", cashAccountId)
    .order("month", { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((r) => ({
    month: String((r as any).month),
    income: Number((r as any).income ?? 0),
    expense: Number((r as any).expense ?? 0),
    balance: Number((r as any).balance ?? 0),
  })) as MonthlyCashBalanceRow[];

  return rows;
}