// app/dashboard/_actions/createCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowCreateInput } from "./_types";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function createCashFlow(
  input: CashFlowCreateInput
): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  // 入力ガード（落とすと原因が分かりやすい）
  if (!Number.isFinite(input.cash_account_id))
    throw new Error("cash_account_id is invalid");
  if (!isYmd(input.date)) throw new Error("Invalid date format (YYYY-MM-DD)");
  if (input.source_type === "manual" && !input.cash_category_id) {
    throw new Error("カテゴリを選択してください（manual必須）");
  }

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: input.cash_account_id, // number
    date: input.date, // "YYYY-MM-DD"
    section: input.section, // "in" | "out"
    amount: input.amount,
    cash_category_id: input.cash_category_id, // number | null
    description: input.description ?? null,
    source_type: input.source_type ?? "manual",
  });

  if (error) throw error;

  return { ok: true };
}