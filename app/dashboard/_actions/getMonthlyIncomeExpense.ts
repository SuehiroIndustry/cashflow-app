// app/dashboard/_actions/getMonthlyIncomeExpense.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MonthlyIncomeExpenseRow } from "../_types";

function normalizeMonthKey(month: string): string {
  // "YYYY-MM" -> "YYYY-MM-01"
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  // "YYYY-MM-01" -> OK
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month;
  throw new Error("Invalid month format. Use 'YYYY-MM' or 'YYYY-MM-01'.");
}

function addMonths(yyyyMm01: string, delta: number): string {
  // yyyyMm01: "YYYY-MM-01"
  const [y, m] = yyyyMm01.split("-").map((v) => Number(v));
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export async function getMonthlyIncomeExpense(input: {
  cash_account_id: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
}): Promise<MonthlyIncomeExpenseRow> {
  const supabase = await createSupabaseServerClient();

  const monthKey = normalizeMonthKey(input.month);
  const monthStart = monthKey; // inclusive
  const nextMonthStart = addMonths(monthKey, 1); // exclusive

  // cash_flows を当月分で集計
  const { data, error } = await supabase
    .from("cash_flows")
    .select("section, amount, date")
    .eq("cash_account_id", input.cash_account_id)
    .gte("date", monthStart)
    .lt("date", nextMonthStart);

  if (error) throw new Error(error.message);

  let income = 0;
  let expense = 0;

  for (const r of data ?? []) {
    const amt = Number((r as any).amount ?? 0) || 0;
    const section = String((r as any).section ?? "");
    if (section === "in") income += amt;
    if (section === "out") expense += amt;
  }

  // ✅ month を必ず返す（今回のビルドエラーの解決点）
  return { month: monthKey, income, expense };
}