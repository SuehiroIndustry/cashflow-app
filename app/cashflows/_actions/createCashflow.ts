"use server";

import { createClient } from "@/utils/supabase/server";

export async function createCashflow(input: {
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  cash_category_id: number; // manual のとき必須
  description?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error("Not authenticated");

  // DB制約に合わせる：source_type NOT NULL / manualならcategory必須
  const payload = {
    cash_account_id: input.cash_account_id,
    date: input.date,
    type: input.type,
    amount: input.amount,
    currency: "JPY",
    source_type: "manual",
    cash_category_id: input.cash_category_id,
    description: input.description ?? null,
    is_projection: false,
    user_id: user.id, // cash_flows に user_id がある前提（スクショにある）
  };

  const { error } = await supabase.from("cash_flows").insert(payload);
  if (error) throw error;

  // 月次集計を関数で回してるなら、ここでRPC呼ぶ（存在しない環境でも落ちないように握りつぶし）
  try {
    // 例: あなたの環境の関数名に合わせて変えてOK
    await supabase.rpc("rebuild_monthly_cash_balance", {
      p_cash_account_id: input.cash_account_id,
    });
  } catch {
    // 何もしない（トリガーで更新される構成もある）
  }

  return { ok: true };
}