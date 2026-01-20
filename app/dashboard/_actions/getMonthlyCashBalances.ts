"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type {
  GetMonthlyCashBalancesInput,
  MonthlyCashBalanceRow,
} from "../_types";

async function getSupabase() {
  // Next.js 16系は cookies() が Promise になりがちなので await が正解
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // cookieStore が Promise じゃない状態なので getAll が生える
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Action / Route の実行環境によっては set が効かないことがあるので握りつぶし
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

export async function getMonthlyCashBalances(
  input: GetMonthlyCashBalancesInput
): Promise<MonthlyCashBalanceRow[]> {
  const supabase = await getSupabase();

  const { cashAccountId, month, rangeMonths } = input;

  // まずは「そのアカウントの最新rangeMonths件」を month desc で返す（シンプルで壊れにくい）
  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("cash_account_id", cashAccountId)
    .lte("month", month)
    .order("month", { ascending: false })
    .limit(rangeMonths);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    month: String(r.month),
    income: Number(r.income ?? 0),
    expense: Number(r.expense ?? 0),
    balance: Number(r.balance ?? 0),
  }));
}