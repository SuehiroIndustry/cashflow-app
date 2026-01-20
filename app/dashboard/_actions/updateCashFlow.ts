// app/dashboard/_actions/updateCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowUpdateInput } from "../_types";
import { ensureMonthlyCashBalance } from "./_ensureMonthlyCashBalance";

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** "YYYY-MM-DD" -> "YYYY-MM-01" */
function ymdToMonthKey(ymd: string) {
  return `${ymd.slice(0, 7)}-01`;
}

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  if (!input?.id) throw new Error("id is required");
  if (!input?.cash_account_id) throw new Error("cash_account_id is required");
  if (!isYmd(input.date)) throw new Error("Invalid date format (YYYY-MM-DD)");
  if (input.section !== "in" && input.section !== "out") throw new Error("Invalid section");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Invalid amount");
  if (!input.cash_category_id) throw new Error("cash_category_id is required");

  // 変更前の month も拾っておく（月跨ぎ編集に備える）
  const { data: before, error: beforeErr } = await supabase
    .from("cash_flows")
    .select("date")
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id)
    .maybeSingle();

  if (beforeErr) throw new Error(beforeErr.message);

  const beforeMonth = before?.date ? ymdToMonthKey(String(before.date)) : null;
  const afterMonth = ymdToMonthKey(input.date);

  const { error } = await supabase
    .from("cash_flows")
    .update({
      date: input.date,
      section: input.section,
      amount: input.amount,
      cash_category_id: input.cash_category_id,
      description: input.description ?? null,
    })
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw new Error(error.message);

  // ★集計を再計算（同月なら1回、月跨ぎなら2回）
  await ensureMonthlyCashBalance({
    cash_account_id: input.cash_account_id,
    month: afterMonth,
  });

  if (beforeMonth && beforeMonth !== afterMonth) {
    await ensureMonthlyCashBalance({
      cash_account_id: input.cash_account_id,
      month: beforeMonth,
    });
  }

  return { ok: true as const };
}