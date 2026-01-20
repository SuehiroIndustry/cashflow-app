"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { OverviewPayload } from "../_types";

function getSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return (cookieStore as any).getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }: any) => {
              (cookieStore as any).set(name, value, options);
            });
          } catch {
            // noop
          }
        },
      },
    }
  );
}

export async function getOverview(params: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<OverviewPayload> {
  const supabase = getSupabase();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  if (!authData?.user) throw new Error("Not authenticated");

  // その月のサマリを monthly_cash_account_balances から取る（最も安定）
  const { data: row, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("income,expense,balance")
    .eq("cash_account_id", params.cash_account_id)
    .eq("month", params.month)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const income = (row as any)?.income ?? 0;
  const expense = (row as any)?.expense ?? 0;
  const balance = (row as any)?.balance ?? 0;

  // OverviewCard が欲しがる形に寄せる
  // ※OverviewPayload の実体に合わせて必要ならここを調整する
  const payload: OverviewPayload = {
    currentBalance: balance,
    thisMonthIncome: income,
    thisMonthExpense: expense,
    net: income - expense,
  } as any;

  return payload;
}