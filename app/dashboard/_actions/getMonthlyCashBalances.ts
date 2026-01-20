// app/dashboard/_actions/getMonthlyCashBalances.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type {
  GetMonthlyCashBalancesInput,
  MonthlyCashAccountBalanceRow,
} from "../_types";

type CookieToSet = {
  name: string;
  value: string;
  options?: any;
};

async function getSupabase() {
  // cookies() が sync/async どっち扱いでも倒れないように吸収
  const cookieStore = await Promise.resolve(cookies());

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        // next/headers の cookieStore は getAll() を持つ
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // Server Action の実行環境によっては set が効かないことがあるので握りつぶす
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              // options の型が合わないので any で逃がす（ここは実害ない）
              (cookieStore as any).set(name, value, options);
            } catch {
              // noop
            }
          });
        } catch {
          // noop
        }
      },
    },
  });
}

export async function getMonthlyCashBalances(
  input: GetMonthlyCashBalancesInput
): Promise<MonthlyCashAccountBalanceRow[]> {
  const supabase = await getSupabase();

  const { cashAccountId, month, rangeMonths } = input;

  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month, income, expense, balance")
    .eq("cash_account_id", cashAccountId)
    .lte("month", month)
    .order("month", { ascending: false })
    .limit(rangeMonths);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    cash_account_id: Number(r.cash_account_id),
    month: String(r.month),
    income: Number(r.income ?? 0),
    expense: Number(r.expense ?? 0),
    balance: Number(r.balance ?? 0),
  }));
}