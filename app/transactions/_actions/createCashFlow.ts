// app/transactions/_actions/createCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowCreateInput } from "@/app/dashboard/_types";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = await createSupabaseServerClient();

  const {
    cash_account_id,
    date,
    section,
    amount,
    cash_category_id,
    description = null,
    source_type = "manual",
  } = input;

  // validate (最低限)
  if (!Number.isFinite(cash_account_id) || cash_account_id <= 0) {
    throw new Error("cash_account_id が不正です");
  }
  if (!isYmd(date)) {
    throw new Error("date が不正です（YYYY-MM-DD）");
  }
  if (section !== "in" && section !== "out") {
    throw new Error("section が不正です（in|out）");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount が不正です（1以上）");
  }

  // 君のDB制約：manual はカテゴリ必須
  if (source_type === "manual" && (cash_category_id == null || cash_category_id <= 0)) {
    throw new Error("cash_category_id が未指定です（manualは必須）");
  }

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id,
    date,
    section,
    amount,
    cash_category_id,
    description: description && description.trim() ? description.trim() : null,
    source_type,
  });

  if (error) throw error;

  return { ok: true as const };
}