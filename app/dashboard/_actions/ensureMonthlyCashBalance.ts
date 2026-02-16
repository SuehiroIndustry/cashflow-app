// app/dashboard/_actions/ensureMonthlyCashBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * monthly_cash_account_balances に (cash_account_id, month) の行が無ければ作る（0で）
 * month は "YYYY-MM-01" を想定
 *
 * NOTE:
 * - 共有（org）前提のため、存在確認は user_id で絞らない
 * - insert の user_id は NOT NULL 対応＆作成者記録として入れる（共有を壊さない）
 */
export async function ensureMonthlyCashBalance(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const { cash_account_id, month } = args;

  // 既にあれば何もしない（共有前提なので user_id では絞らない）
  const { data: existing, error: selErr } = await supabase
    .from("monthly_cash_account_balances")
    .select("cash_account_id, month")
    .eq("cash_account_id", cash_account_id)
    .eq("month", month)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return;

  // 無ければ作る（0で）
  const { error: insErr } = await supabase
    .from("monthly_cash_account_balances")
    .insert({
      user_id: user.id,
      cash_account_id,
      month,
      income: 0,
      expense: 0,
      balance: 0,
    });

  if (insErr) throw insErr;
}