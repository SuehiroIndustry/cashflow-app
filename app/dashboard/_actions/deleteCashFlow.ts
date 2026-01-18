// app/dashboard/_actions/deleteCashFlow.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashFlowDeleteInput } from "../_types";

export async function deleteCashFlow(args: CashFlowDeleteInput): Promise<void> {
  // ★ここが重要：createClient が Promise を返す実装になってるので await が必須
  const supabase = await createClient();

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