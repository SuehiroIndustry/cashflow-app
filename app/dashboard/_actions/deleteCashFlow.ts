// app/dashboard/_actions/deleteCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowDeleteInput } from "../_types";

export async function deleteCashFlow(
  input: CashFlowDeleteInput
): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  // ここはRLSで cash_account_id も守られてる前提だけど、
  // 念のため条件に含めると事故が減る
  const { error } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw error;

  return { ok: true };
}