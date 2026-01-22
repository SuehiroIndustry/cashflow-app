// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { MonthlyBalanceRow } from "../_types";

type GetMonthlyCashBalanceInput = {
  cashAccountId: number;
  month: string; // "YYYY-MM-01"
  rangeMonths: number; // 3/6/12...
};

async function getSupabase() {
  const cookieStore = await cookies();

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
              } catch {
                // noop
              }
            });
          } catch {
            // noop
          }
        },
      },
    }
  );
}

function normalizeMonthKey(input: string): string {
  // Accept: "YYYY-MM" or "YYYY-MM-01"
  if (/^\d{4}-\d{2}$/.test(input)) return `${input}-01`;
  return input;
}

export async function getMonthlyCashBalance(
  input: GetMonthlyCashBalanceInput
): Promise<MonthlyBalanceRow[]> {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const month = normalizeMonthKey(input.month);

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance")
    .eq("cash_account_id", input.cashAccountId)
    .lte("month", month)
    .order("month", { ascending: false })
    .limit(input.rangeMonths);

  if (error) throw new Error(error.message);

  // 返すのは昇順に揃える（UI側で扱いやすい）
  const rows = (data ?? []) as MonthlyBalanceRow[];
  rows.sort((a, b) => a.month.localeCompare(b.month));
  return rows;
}