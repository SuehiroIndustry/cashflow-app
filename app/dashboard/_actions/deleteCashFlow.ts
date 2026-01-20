// app/dashboard/_actions/deleteCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowDeleteInput } from "../_types";
import { ensureMonthlyCashBalance } from "./_ensureMonthlyCashBalance";

/** "YYYY-MM-DD" -> "YYYY-MM-01" */
function ymdToMonthKey(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

export async function deleteCashFlow(input: CashFlowDeleteInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  if (!input?.id) throw new Error("id is required");
  if (!input?.cash_account_id) throw new Error("cash_account_id is required");

  // 先に月を取る（消した後だと分からん）
  const { data: before, error: beforeErr } = await supabase
    .from("cash_flows")
    .select("date")
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id)
    .maybeSingle();

  if (beforeErr) throw new Error(beforeErr.message);
  const month = before?.date ? ymdToMonthKey(String(before.date)) : null;

  const { error } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw new Error(error.message);

  if (month) {
    await ensureMonthlyCashBalance({
      cash_account_id: input.cash_account_id,
      month,
    });
  }

  return { ok: true as const };
}