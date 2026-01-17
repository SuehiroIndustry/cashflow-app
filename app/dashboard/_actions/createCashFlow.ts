"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createCashFlow(input: {
  cash_account_id: number;
  occurred_on: string; // '2026-01-17'
  amount: number; // + income / - expense
  memo?: string | null;
  cash_category_id?: number | null; // manual のとき必須なら入れる
  source_type?: "manual" | "import";
}) {
  const supabase = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) throw new Error("Not authenticated");

  const payload = {
    user_id: userRes.user.id,
    cash_account_id: input.cash_account_id,
    occurred_on: input.occurred_on,
    amount: input.amount,
    memo: input.memo ?? null,
    source_type: input.source_type ?? "manual",
    cash_category_id: input.cash_category_id ?? null,
  };

  const { error } = await supabase.from("cash_flows").insert(payload);
  if (error) throw new Error(error.message);

  return { ok: true };
}