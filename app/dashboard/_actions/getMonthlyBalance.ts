// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { MonthlyBalanceRow } from "../_types";

type Input = {
  cashAccountId: number; // 0 = all
  fromMonth: string; // YYYY-MM-01
  months: number; // e.g. 12
};

/**
 * monthly_cash_account_balances を読み、BalanceCard/EcoCharts 用に整形して返す
 * - cashAccountId=0 のときは口座を跨いで月別に合算
 * - cashAccountId>0 のときはその口座のみ
 */
export async function getMonthlyBalance(input: Input): Promise<MonthlyBalanceRow[]> {
  const supabase = await createClient();

  const cashAccountId = Number(input.cashAccountId);
  const months = Math.max(1, Math.min(36, Number(input.months) || 12));

  const from = new Date(input.fromMonth);
  if (Number.isNaN(from.getTime())) {
    throw new Error("fromMonth が不正です（YYYY-MM-01）");
  }

  const to = new Date(from);
  to.setMonth(to.getMonth() + months);

  const fromStr = from.toISOString().slice(0, 10); // YYYY-MM-DD
  const toStr = to.toISOString().slice(0, 10);

  let q = supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance")
    .gte("month", fromStr)
    .lt("month", toStr)
    .order("month", { ascending: true });

  if (cashAccountId !== 0) {
    q = q.eq("cash_account_id", cashAccountId);
  }

  const { data, error } = await q;
  if (error) throw error;

  // month 単位でまとめる（all のときは口座を合算）
  const byMonth = new Map<
    string,
    { income: number; expense: number; balance: number }
  >();

  for (const r of data ?? []) {
    const month = String((r as any).month ?? "");
    if (!month) continue;

    const income = Number((r as any).income ?? 0);
    const expense = Number((r as any).expense ?? 0);
    const balance = Number((r as any).balance ?? 0);

    const cur = byMonth.get(month) ?? { income: 0, expense: 0, balance: 0 };
    cur.income += Number.isFinite(income) ? income : 0;
    cur.expense += Number.isFinite(expense) ? expense : 0;
    cur.balance += Number.isFinite(balance) ? balance : 0;
    byMonth.set(month, cur);
  }

  const rows: MonthlyBalanceRow[] = Array.from(byMonth.entries()).map(
    ([month, v]) => ({
      month, // "2026-02-01" のまま表示してるので、必要なら後でラベル化する
      income: Math.round(v.income),
      expense: Math.round(v.expense),
      balance: Math.round(v.balance),
    })
  );

  // 念のため月順
  rows.sort((a, b) => a.month.localeCompare(b.month));
  return rows;
}