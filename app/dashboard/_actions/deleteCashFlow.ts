// app/dashboard/_actions/deleteCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowDeleteInput } from "../_types";

export default async function deleteCashFlow(args: CashFlowDeleteInput): Promise<void> {
  // ★ここがポイント：createClient / createSupabaseServerClient が Promise を返すなら await 必須
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", args.id)
    .eq("cash_account_id", args.cash_account_id);

  if (error) throw error;
}