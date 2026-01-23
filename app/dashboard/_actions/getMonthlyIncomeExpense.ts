"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyIncomeExpenseRow } from "../_types";

function normalizeMonthKey(month: string): string {
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month;
  throw new Error("Invalid month format.");
}

function addMonths(yyyyMm01: string, delta: number): string {
  const [y, m] = yyyyMm01.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export async function getMonthlyIncomeExpense(input: {
  cash_account_id: number;
  month: string;
}): Promise<MonthlyIncomeExpenseRow> {
  const supabase = await createSupabaseServerClient();

  const monthKey = normalizeMonthKey(input.month);
  const nextMonth = addMonths(monthKey, 1);

  const { data, error } = await supabase
    .from("cash_flows")
    .select("section, amount, date")
    .eq("cash_account_id", input.cash_account_id)
    .gte("date", monthKey)
    .lt("date", nextMonth);

  if (error) throw new Error(error.message);

  let income = 0;
  let expense = 0;

  for (const r of data ?? []) {
    const amt = Number((r as any).amount ?? 0);
    if ((r as any).section === "in") income += amt;
    if ((r as any).section === "out") expense += amt;
  }

  return {
    month: monthKey,
    income,
    expense,
    net: income - expense,
  };
}