// app/dashboard/_actions/deleteCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * cash_flows を削除（RLS 前提）
 * - 念のため cash_account_id も条件に入れる（誤爆防止）
 */
export async function deleteCashFlow(args: {
  id: number;
  cash_account_id: number;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // auth（ルールに合わせて一応チェック）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", args.id)
    .eq("cash_account_id", args.cash_account_id);

  if (error) throw error;
}