"use server";

import { createClient } from "@/utils/supabase/server";

type Input = {
  type: "income" | "expense";
  cash_account_id: number;
  cash_category_id: number;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string | null;
  section: string | null;
};

export async function createCashFlow(input: Input): Promise<
  | { ok: true }
  | {
      ok: false;
      message: string;
    }
> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return { ok: false, message: userErr.message };
  if (!user) return { ok: false, message: "Not authenticated" };

  // 最低限のバリデーション
  if (!input.cash_account_id) return { ok: false, message: "Account is required" };
  if (!input.cash_category_id) return { ok: false, message: "Category is required" };
  if (!input.date) return { ok: false, message: "Date is required" };
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    return { ok: false, message: "Amount must be > 0" };

  const { error } = await supabase.from("cash_flows").insert({
    user_id: user.id, // テーブルに user_id がある前提（スクショ上あった）
    cash_account_id: input.cash_account_id,
    cash_category_id: input.cash_category_id,
    date: input.date,
    type: input.type,
    amount: input.amount,
    currency: "JPY",
    source_type: "manual",
    source_id: null,
    is_projection: false,
    description: input.description,
    section: input.section,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}