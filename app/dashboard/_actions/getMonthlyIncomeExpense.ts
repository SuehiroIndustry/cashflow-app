// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyIncomeExpenseRow } from "../_types";

function normalizeMonthKey(month: string): string {
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month;
  throw new Error("Invalid month format");
}

function nextMonthStart(monthStartYYYYMM01: string): string {
  const d = new Date(`${monthStartYYYYMM01}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid month format");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function getMonthlyIncomeExpense(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
}): Promise<MonthlyIncomeExpenseRow> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const monthKey = normalizeMonthKey(args.month);
  const monthEnd = nextMonthStart(monthKey);

  const { data, error } = await supabase
    .from("cash_flows")
    .select("section, amount")
    .eq("cash_account_id", args.cash_account_id)
    .gte("date", monthKey)
    .lt("date", monthEnd);

  if (error) throw error;

  let income = 0;
  let expense = 0;

  for (const r of data ?? []) {
    const amount = Number((r as any).amount ?? 0);
    const section = (r as any).section as "in" | "out";
    if (section === "in") income += amount;
    if (section === "out") expense += amount;
  }

  return { income, expense };
}