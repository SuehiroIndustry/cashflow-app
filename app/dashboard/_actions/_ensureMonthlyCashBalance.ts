// app/dashboard/_actions/_ensureMonthlyCashBalance.ts
"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * monthly_cash_account_balances に
 * (cash_account_id, month) の行が無ければ作る（0初期化）
 */
export async function ensureMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // 既存確認
  const { data: existing, error: selErr } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month")
    .eq("cash_account_id", args.cash_account_id)
    .eq("month", args.month)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return;

  // 無ければ作る（RLSが user_id を見る想定なので埋める）
  const { error: insErr } = await supabase
    .from("monthly_cash_account_balances")
    .insert({
      cash_account_id: args.cash_account_id,
      month: args.month,
      income: 0,
      expense: 0,
      balance: 0,
      user_id: user.id,
    });

  if (insErr) throw insErr;
}