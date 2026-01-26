// app/dashboard/_actions/getMonthlyBalance.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { MonthlyBalanceRow } from "../_types";

type Input = {
  cashAccountId: number; // 0 = all accounts
  months: number; // 例: 12（直近12ヶ月）
};

function monthStartISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function monthLabel(iso: string) {
  // "YYYY-MM-01" -> "YYYY-MM"
  if (typeof iso !== "string") return String(iso);
  return iso.slice(0, 7);
}

export async function getMonthlyBalance(input: Input): Promise<MonthlyBalanceRow[]> {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error("Not authenticated");

  const cashAccountId = Number(input.cashAccountId);
  const months = Math.max(1, Math.min(60, Number(input.months) || 12));

  // 直近Nヶ月（今月含む）
  const end = new Date(); // now
  const start = addMonths(new Date(end.getFullYear(), end.getMonth(), 1), -(months - 1));

  const from = monthStartISO(start);
  const to = monthStartISO(addMonths(new Date(end.getFullYear(), end.getMonth(), 1), 1)); // next month start (exclusive)

  // monthly_cash_account_balances を想定（前に作った集計テーブル）
  let q = supabase
    .from("monthly_cash_account_balances")
    .select("month,income,expense,balance,cash_account_id,user_id")
    .eq("user_id", userId)
    .gte("month", from)
    .lt("month", to)
    .order("month", { ascending: true });

  if (cashAccountId !== 0) {
    q = q.eq("cash_account_id", cashAccountId);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];

  // 口座=0（全口座）の場合はJSで月次合算
  if (cashAccountId === 0) {
    const map = new Map<string, MonthlyBalanceRow>();

    for (const r of rows as any[]) {
      const m = String(r.month);
      const key = m.slice(0, 10); // "YYYY-MM-01"
      const cur = map.get(key) ?? {
        month: monthLabel(key),
        income: 0,
        expense: 0,
        balance: 0,
      };

      cur.income += Number(r.income ?? 0);
      cur.expense += Number(r.expense ?? 0);
      cur.balance += Number(r.balance ?? 0); // 合算なので “月次増減” として扱うならOK。残高合算で見たいなら別途仕様決めよう
      map.set(key, cur);
    }

    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, v]) => ({
        month: v.month,
        income: Math.round(v.income),
        expense: Math.round(v.expense),
        balance: Math.round(v.balance),
      }));
  }

  // 単一口座
  return (rows as any[]).map((r) => ({
    month: monthLabel(String(r.month)),
    income: Math.round(Number(r.income ?? 0)),
    expense: Math.round(Number(r.expense ?? 0)),
    balance: Math.round(Number(r.balance ?? 0)),
  }));
}