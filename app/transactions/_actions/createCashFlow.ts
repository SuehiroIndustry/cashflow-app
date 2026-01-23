"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type CashFlowCreateInput = {
  cashAccountId: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  cashCategoryId: number; // manual は必須
  description?: string | null;
  sourceType?: "manual"; // 今は manual 固定でOK
};

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const {
    cashAccountId,
    date,
    section,
    amount,
    cashCategoryId,
    description = null,
    sourceType = "manual",
  } = input;

  // validate（最低限）
  if (!Number.isFinite(cashAccountId) || cashAccountId <= 0) {
    throw new Error("cashAccountId が不正です");
  }
  if (!isYmd(date)) {
    throw new Error("date は YYYY-MM-DD で指定してください");
  }
  if (section !== "in" && section !== "out") {
    throw new Error("section が不正です");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount が不正です");
  }
  if (!Number.isFinite(cashCategoryId) || cashCategoryId <= 0) {
    throw new Error("cashCategoryId が未選択です（manualは必須）");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: cashAccountId,
    date,
    section,
    amount,
    cash_category_id: cashCategoryId,
    description,
    source_type: sourceType,
  });

  if (error) throw new Error(error.message);

  // 反映
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/simulation");
}