"use server";

import { createClient } from "@/utils/supabase/server";

type CashFlowType = "income" | "expense";
type SourceType = "manual" | "import";

export type CreateCashFlowInput = {
  type: CashFlowType;
  cash_account_id: string;          // ★ string に統一
  cash_category_id: string;         // ★ manual 前提なら必須でOK（運用に合わせて）
  date: string;                     // YYYY-MM-DD
  amount: number;
  memo: string | null;
  source_type: SourceType;          // manual / import
};

export async function createCashFlow(input: CreateCashFlowInput) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return { error: userErr.message };
  if (!user) return { error: "Not authenticated" };

  // --- 最低限のバリデーション ---
  if (!input.cash_account_id) return { error: "cash_account_id is required" };
  if (!input.date) return { error: "date is required" };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: "amount must be a positive number" };
  }

  // ★君のDB制約：manual の場合はカテゴリ必須
  if (input.source_type === "manual" && !input.cash_category_id) {
    return { error: "cash_category_id is required for manual" };
  }

  const { error } = await supabase.from("cash_flows").insert({
    type: input.type,
    cash_account_id: input.cash_account_id,     // ★ string のまま入れる
    cash_category_id: input.cash_category_id,   // ★ string のまま入れる
    date: input.date,
    amount: input.amount,
    memo: input.memo,
    source_type: input.source_type,
  });

  if (error) return { error: error.message };

  return { ok: true };
}