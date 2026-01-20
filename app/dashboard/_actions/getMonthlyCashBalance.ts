// app/dashboard/_actions/getMonthlyCashBalance.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { MonthlyCashBalanceRow } from "../_types";

type GetMonthlyCashBalanceInput = {
  cashAccountId: number;
  // month は "YYYY-MM-01" などの date を想定（Dashboard 側の selectedMonth に合わせる）
  month: string; // 例: "2026-01-01"
  // 何ヶ月分出すか（last 12 months など）
  rangeMonths?: number; // default 12
};

function toMonthStart(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-based
  return new Date(y, m, 1);
}

function addMonths(d: Date, diff: number) {
  return new Date(d.getFullYear(), d.getMonth() + diff, 1);
}

function formatDateYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Next 16 の cookies() は Promise なので await 済み cookieStore を使う
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Action 内の set が無効ケースはあるが致命ではない
          }
        },
      },
    }
  );
}

/**
 * 月次キャッシュ残高（income/expense/balance）を rangeMonths 分返す
 * 前提テーブル: public.monthly_cash_balances
 * 期待カラム: cash_account_id, month, income, expense, balance
 */
export async function getMonthlyCashBalances(
  input: GetMonthlyCashBalanceInput
): Promise<MonthlyCashBalanceRow[]> {
  const { cashAccountId, month, rangeMonths = 12 } = input;

  const supabase = await getSupabase();

  // month（string）を起点に、過去 rangeMonths 分の month_start を作る
  const base = toMonthStart(new Date(month));
  const from = addMonths(base, -(rangeMonths - 1));
  const toExclusive = addMonths(base, 1);

  const fromStr = formatDateYYYYMMDD(from);
  const toStr = formatDateYYYYMMDD(toExclusive);

  const { data, error } = await supabase
    .from("monthly_cash_balances")
    .select("cash_account_id, month, income, expense, balance")
    .eq("cash_account_id", cashAccountId)
    .gte("month", fromStr)
    .lt("month", toStr)
    .order("month", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // DBが date/timestamptz で返しても string に寄せる
  return (data ?? []).map((r: any) => ({
    cash_account_id: Number(r.cash_account_id ?? cashAccountId),
    month: String(r.month),
    income: Number(r.income ?? 0),
    expense: Number(r.expense ?? 0),
    balance: Number(r.balance ?? 0),
  }));
}