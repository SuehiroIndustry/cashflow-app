// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { MonthlyBalanceRow } from "../_types";

type Input = {
  cashAccountId: number; // 0 = all
  fromMonth: string; // YYYY-MM-01
  months: number; // 例: 12
};

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function toMonthKey(isoDate: string) {
  // "2026-02-01" -> "2026-02"
  return isoDate.slice(0, 7);
}

export async function getMonthlyBalance(input: Input): Promise<MonthlyBalanceRow[]> {
  const supabase = await createClient();

  const cashAccountId = Number(input.cashAccountId);
  const from = new Date(input.fromMonth);
  if (Number.isNaN(from.getTime())) {
    throw new Error("fromMonth が不正です（YYYY-MM-01）");
  }

  const months = Math.max(1, Math.min(60, Number(input.months) || 12));
  const toExclusive = addMonths(from, months);

  const fromIso = from.toISOString().slice(0, 10);
  const toIso = toExclusive.toISOString().slice(0, 10);

  // monthly_cash_account_balances を前提（あなたが前に作った recalc の吐き先）
  // 列想定: cash_account_id, month(date), income, expense, balance
  let q = supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance")
    .gte("month", fromIso)
    .lt("month", toIso)
    .order("month", { ascending: true });

  if (cashAccountId !== 0) {
    q = q.eq("cash_account_id", cashAccountId);
  }

  const { data, error } = await q;
  if (error) throw error;

  // 口座=0（全口座）の場合は「同月の合算」にする
  if (cashAccountId === 0) {
    const map = new Map<string, { income: number; expense: number; balance: number }>();

    for (const r of data ?? []) {
      const month = String((r as any).month).slice(0, 10);
      const key = toMonthKey(month);

      const income = Number((r as any).income ?? 0);
      const expense = Number((r as any).expense ?? 0);
      const balance = Number((r as any).balance ?? 0);

      const cur = map.get(key) ?? { income: 0, expense: 0, balance: 0 };
      cur.income += income;
      cur.expense += expense;
      cur.balance += balance;
      map.set(key, cur);
    }

    return Array.from(map.entries()).map(([key, v]) => ({
      month: key,
      income: Math.round(v.income),
      expense: Math.round(v.expense),
      balance: Math.round(v.balance),
    }));
  }

  // 単一口座
  return (data ?? []).map((r: any) => ({
    month: toMonthKey(String(r.month).slice(0, 10)),
    income: Math.round(Number(r.income ?? 0)),
    expense: Math.round(Number(r.expense ?? 0)),
    balance: Math.round(Number(r.balance ?? 0)),
  }));
}