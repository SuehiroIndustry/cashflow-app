// app/dashboard/_actions/updateCashFlow.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashFlowUpdateInput } from "../_types";

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  // 手入力運用の前提：カテゴリ必須
  if (!input.cash_category_id) {
    throw new Error("カテゴリを選択してください（manual必須）");
  }

  // YYYY-MM-DD ざっくり検証
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error("日付が不正です（YYYY-MM-DD）");
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount)) {
    throw new Error("金額が不正です");
  }

  const { error } = await supabase
    .from("cash_flows")
    .update({
      date: input.date,
      section: input.section,
      amount,
      cash_category_id: input.cash_category_id,
      description: input.description ?? null,
      // source_type は更新しない（手入力・CSVの区別は維持）
    })
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw new Error(error.message);

  return { ok: true };
}