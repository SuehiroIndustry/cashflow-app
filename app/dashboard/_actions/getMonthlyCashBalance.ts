// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyCashBalanceRow } from "../_types";

function isMonthKey(s: string) {
  return /^\d{4}-\d{2}-01$/.test(s);
}

function addMonths(monthYYYYMM01: string, delta: number): string {
  // monthYYYYMM01: "YYYY-MM-01"
  const d = new Date(`${monthYYYYMM01}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid month format");

  d.setUTCMonth(d.getUTCMonth() + delta);
  return d.toISOString().slice(0, 10); // "YYYY-MM-01"
}

function nextMonthStart(monthYYYYMM01: string): string {
  return addMonths(monthYYYYMM01, 1);
}

export async function getMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  range?: number; // last N months (ending at month)
}): Promise<MonthlyCashBalanceRow[]> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  if (!Number.isFinite(args.cash_account_id)) {
    throw new Error("cash_account_id is invalid");
  }
  if (!isMonthKey(args.month)) {
    throw new Error("Invalid month format");
  }

  const range = Math.max(1, Math.min(60, Math.floor(args.range ?? 12))); // 1〜60に丸め
  const startMonth = addMonths(args.month, -(range - 1)); // 含む
  const endMonth = nextMonthStart(args.month); // 含まない

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select(
      `
      cash_account_id,
      month,
      income,
      expense,
      balance,
      updated_at
    `
    )
    .eq("cash_account_id", args.cash_account_id)
    .gte("month", startMonth)
    .lt("month", endMonth)
    .order("month", { ascending: true });

  if (error) throw error;

  return (data ?? []) as MonthlyCashBalanceRow[];
}