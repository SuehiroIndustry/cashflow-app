// app/dashboard/_actions/updateCashFlow.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashFlowUpdateInput } from "@/app/dashboard/_types";

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = await createClient();

  const { id, cash_account_id, date, section, amount, cash_category_id, description } = input;

  if (!id) throw new Error("id がありません");
  if (!cash_account_id) throw new Error("cash_account_id がありません");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date が不正です（YYYY-MM-DD）");
  if (section !== "in" && section !== "out") throw new Error("section が不正です");
  if (!Number.isFinite(amount) || amount < 0) throw new Error("amount が不正です");
  if (!cash_category_id) throw new Error("cash_category_id が必要です（manual必須）");

  const { error } = await supabase
    .from("cash_flows")
    .update({
      date,
      section,
      amount,
      cash_category_id,
      description,
    })
    .eq("id", id)
    .eq("cash_account_id", cash_account_id);

  if (error) {
    console.error(error);
    throw new Error(error.message);
  }

  return { ok: true };
}