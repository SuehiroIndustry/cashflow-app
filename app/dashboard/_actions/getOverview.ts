// app/dashboard/_actions/getOverview.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OverviewPayload } from "../_types";

function normalizeMonthKey(month: string): string {
  // "YYYY-MM" -> "YYYY-MM-01"
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  // "YYYY-MM-01" -> OK
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return month;
  throw new Error("Invalid month format. Use 'YYYY-MM' or 'YYYY-MM-01'.");
}

function addMonths(yyyyMm01: string, delta: number): string {
  const [y, m] = yyyyMm01.split("-").map((v) => Number(v));
  const d = new Date(Date.UTC(y, m - 1, 1));
  d.setUTCMonth(d.getUTCMonth() + delta);
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export async function getOverview(input: {
  cashAccountId: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
}): Promise<OverviewPayload> {
  const supabase = await createSupabaseServerClient();

  const monthKey = normalizeMonthKey(input.month);
  const monthStart = monthKey; // inclusive
  const nextMonthStart = addMonths(monthKey, 1); // exclusive

  // 口座（名称・現在残高）
  const { data: acc, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .eq("id", input.cashAccountId)
    .maybeSingle();

  if (accErr) throw new Error(accErr.message);
  if (!acc) throw new Error("cash_accounts が見つかりません");

  // 当月の入出金集計
  const { data: flows, error: flowErr } = await supabase
    .from("cash_flows")
    .select("section, amount, date")
    .eq("cash_account_id", input.cashAccountId)
    .gte("date", monthStart)
    .lt("date", nextMonthStart);

  if (flowErr) throw new Error(flowErr.message);

  let income = 0;
  let expense = 0;

  for (const r of flows ?? []) {
    const amt = Number((r as any).amount ?? 0) || 0;
    const section = String((r as any).section ?? "");
    if (section === "in") income += amt;
    if (section === "out") expense += amt;
  }

  const net = income - expense;

  return {
    accountName: String((acc as any).name ?? ""),
    currentBalance: Number((acc as any).current_balance ?? 0) || 0,
    thisMonthIncome: income,
    thisMonthExpense: expense,
    net,
    month: monthKey,
  };
}