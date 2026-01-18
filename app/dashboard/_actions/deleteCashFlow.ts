// app/dashboard/_actions/deleteCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowDeleteInput } from "../_types";

export async function deleteCashFlow(args: CashFlowDeleteInput): Promise<void> {
  const supabase = await createSupabaseServerClient();

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