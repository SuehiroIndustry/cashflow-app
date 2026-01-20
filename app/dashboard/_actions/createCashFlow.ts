// app/dashboard/_actions/createCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowCreateInput } from "../_types";
import { ensureMonthlyCashBalance } from "./_ensureMonthlyCashBalance";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** "YYYY-MM-DD" -> "YYYY-MM-01" */
function ymdToMonthKey(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  if (!input?.cash_account_id) throw new Error("cash_account_id is required");
  if (!isYmd(input.date)) throw new Error("Invalid date format (YYYY-MM-DD)");
  if (input.section !== "in" && input.section !== "out") throw new Error("Invalid section");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Invalid amount");

  // manual の場合はカテゴリ必須（君のCHECK制約に合わせる）
  if (input.source_type === "manual" && !input.cash_category_id) {
    throw new Error("cash_category_id is required for manual");
  }

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: input.cash_account_id,
    date: input.date,
    section: input.section,
    amount: input.amount,
    cash_category_id: input.cash_category_id,
    description: input.description ?? null,
    source_type: input.source_type ?? "manual",
  });

  if (error) throw new Error(error.message);

  await ensureMonthlyCashBalance({
    cash_account_id: input.cash_account_id,
    month: ymdToMonthKey(input.date),
  });

  return { ok: true as const };
}