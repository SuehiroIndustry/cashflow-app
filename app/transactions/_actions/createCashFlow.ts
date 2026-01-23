// app/transactions/_actions/createCashFlow.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  cashCategoryId: number; // manualの場合必須
  description: string | null;
  sourceType: "manual";
};

export async function createCashFlow(input: CashFlowCreateInput): Promise<{ id: number }> {
  const supabase = await createClient();

  // 念のためガード（DBにもCHECKあるけど先に落とす）
  if (input.sourceType === "manual" && !input.cashCategoryId) {
    throw new Error("manual の場合 cashCategoryId は必須です");
  }

  const { data, error } = await supabase
    .from("cash_flows")
    .insert({
      cash_account_id: input.cashAccountId,
      date: input.date,
      section: input.section,
      amount: input.amount,
      cash_category_id: input.cashCategoryId,
      description: input.description,
      source_type: input.sourceType,
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error("insert succeeded but id is missing");

  return { id: data.id as number };
}