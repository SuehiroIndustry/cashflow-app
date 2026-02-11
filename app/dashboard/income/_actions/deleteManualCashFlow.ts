// app/dashboard/income/_actions/deleteManualCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Input = {
  cashFlowId: number;
  cashAccountId: number;
  date: string; // YYYY-MM-DD
};

function monthStart(d: string) {
  const y = d.slice(0, 4);
  const m = d.slice(5, 7);
  return `${y}-${m}-01`;
}

export async function deleteManualCashFlow(input: Input): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (!input.cashFlowId) throw new Error("cashFlowId が不正です");
  if (!input.cashAccountId) throw new Error("cashAccountId が不正です");
  if (!input.date) throw new Error("date が不正です");

  // ✅ manual のみ削除可（インポート等は削除不可）
  const { error: delErr } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", input.cashFlowId)
    .eq("source_type", "manual");

  if (delErr) throw new Error(delErr.message);

  // ✅ 月次再計算
  const { error: rpcErr } = await supabase.rpc("recalc_monthly_cash_balance", {
    p_cash_account_id: input.cashAccountId,
    p_month: monthStart(input.date),
  });

  if (rpcErr) throw new Error(rpcErr.message);
}