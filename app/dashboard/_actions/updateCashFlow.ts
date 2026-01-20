// app/dashboard/_actions/updateCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowUpdateInput } from "../_types";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = await createSupabaseServerClient(); // ★ここが重要（Promiseのまま使わない）

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  if (!input?.id) throw new Error("id is required");
  if (!input?.cash_account_id) throw new Error("cash_account_id is required");
  if (!isYmd(input.date)) throw new Error("Invalid date format (YYYY-MM-DD)");
  if (input.section !== "in" && input.section !== "out") throw new Error("Invalid section");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Invalid amount");
  if (!input.cash_category_id) throw new Error("cash_category_id is required");

  // RLS を想定：cash_account_id も条件に入れて事故を防ぐ
  const { error } = await supabase
    .from("cash_flows")
    .update({
      date: input.date,
      section: input.section,
      amount: input.amount,
      cash_category_id: input.cash_category_id,
      description: input.description ?? null,
      // user_id を更新したりはしない（RLSで担保）
    })
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw new Error(error.message);

  return { ok: true as const };
}