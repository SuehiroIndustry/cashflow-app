"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CashProjectionResult, GetCashProjectionInput } from "../_types";

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

async function getSupabase() {
  const cookieStore = await Promise.resolve(cookies());
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options as any);
              } catch {}
            });
          } catch {}
        },
      },
    }
  );
}

export async function getCashProjection(
  input: GetCashProjectionInput
): Promise<CashProjectionResult> {
  const { cashAccountId, startDate, days } = input;

  const supabase = await getSupabase();

  // ① 現在残高
  const { data: acc, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, current_balance")
    .eq("id", cashAccountId)
    .maybeSingle();

  if (accErr) throw new Error(accErr.message);

  const currentBalance = toNumber(acc?.current_balance ?? 0);

  // ② 期間末
  const endDate = addDays(startDate, days);

  // ③ 未来 cash_flows を取得（startDate <= date < endDate）
  const { data: flows, error: flowsErr } = await supabase
    .from("cash_flows")
    .select("date, section, amount")
    .eq("cash_account_id", cashAccountId)
    .gte("date", startDate)
    .lt("date", endDate)
    .order("date", { ascending: true });

  if (flowsErr) throw new Error(flowsErr.message);

  // ④ 日付ごとに集計
  const map = new Map<string, { income: number; expense: number }>();
  for (const f of flows ?? []) {
    const day = String((f as any).date).slice(0, 10);
    const section = String((f as any).section);
    const amount = toNumber((f as any).amount);

    const cur = map.get(day) ?? { income: 0, expense: 0 };
    if (section === "in") cur.income += amount;
    else if (section === "out") cur.expense += amount;
    map.set(day, cur);
  }

  // ⑤ 1日ずつ残高を積み上げ（予定が無い日は0扱い）
  let bal = currentBalance;
  let shortDate: string | null = null;

  const rows: CashProjectionResult["rows"] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(startDate, i);
    const agg = map.get(day) ?? { income: 0, expense: 0 };
    const net = agg.income - agg.expense;
    bal += net;

    if (shortDate == null && bal <= 0) shortDate = day;

    rows.push({
      date: day,
      income: agg.income,
      expense: agg.expense,
      net,
      balance: bal,
    });
  }

  return {
    cashAccountId,
    startDate,
    days,
    currentBalance,
    shortDate,
    rows,
  };
}