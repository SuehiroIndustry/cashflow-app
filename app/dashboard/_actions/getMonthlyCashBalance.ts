"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MonthlyCashBalanceRow = {
  month: string; // e.g. "2026-01-01"
  income: number;
  expense: number;
  balance: number;
};

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return 0;
}

export async function getMonthlyCashBalance(cashAccountId: number) {
  const supabase = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");

  // monthly_cash_account_balances.cash_account_id は integer
  const cashAccountIdInt = Number(cashAccountId);
  if (!Number.isFinite(cashAccountIdInt) || !Number.isInteger(cashAccountIdInt)) {
    throw new Error(`Invalid cashAccountId: ${cashAccountId}`);
  }

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("user_id", userRes.user.id)
    .eq("cash_account_id", cashAccountIdInt)
    .order("month", { ascending: false })
    .limit(12);

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((r) => ({
    month: String((r as any).month),
    income: toNumber((r as any).income),
    expense: toNumber((r as any).expense),
    balance: toNumber((r as any).balance),
  })) as MonthlyCashBalanceRow[];

  return rows;
}