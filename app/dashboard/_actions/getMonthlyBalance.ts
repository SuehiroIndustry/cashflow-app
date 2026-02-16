// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyBalanceRow } from "../_types";

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function getMonthlyBalance(params: {
  cashAccountId: number;
  months: number; // 例: 12
}): Promise<MonthlyBalanceRow[]> {
  const supabase = await createSupabaseServerClient();

  // auth（RLS前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const cashAccountId = Number(params.cashAccountId);
  const months = Math.max(1, Number(params.months ?? 12));

  // ✅ ここが重要：user_idで絞らない（org共有）
  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance, cash_account_id")
    .eq("cash_account_id", cashAccountId)
    .order("month", { ascending: false })
    .limit(months);

  if (error) {
    console.error("[getMonthlyBalance] error:", error);
    return [];
  }

  return (data ?? []).map((r: any) => ({
    month: String(r.month ?? ""),
    income: toNumber(r.income, 0),
    expense: toNumber(r.expense, 0),
    balance: toNumber(r.balance, 0),
  }));
}