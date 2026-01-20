"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { MonthlyCashBalanceRow } from "../_types";

type Input = {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
  range_months: number; // 例: 12
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
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Action内でsetが無効なケースがあるが、致命ではない
          }
        },
      },
    }
  );
}

export async function getMonthlyCashBalances(
  input: Input
): Promise<MonthlyCashBalanceRow[]> {
  const supabase = await getSupabase();

  // 認証チェック（RLS前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  // month から range_months 分だけ遡る（DB側は date なのでそのまま渡す）
  const { cash_account_id, month, range_months } = input;

  const { data, error } = await supabase
    .from("monthly_cash_balances")
    .select("month,income,expense,balance")
    .eq("cash_account_id", cash_account_id)
    .gte("month", month) // まずは当月以降だけ、後で必要なら期間計算を入れる
    .order("month", { ascending: true });

  if (error) throw new Error(error.message);

  // DBが date で返すので string に寄せる
  return (data ?? []).map((r: any) => ({
    month: String(r.month),
    income: Number(r.income ?? 0),
    expense: Number(r.expense ?? 0),
    balance: Number(r.balance ?? 0),
  }));
}