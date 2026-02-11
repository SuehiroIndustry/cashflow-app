// app/dashboard/income/_actions/createManualCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Input = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  description: string | null;
  cashAccountId: number;
  cashCategoryId: number;
};

function monthStart(d: string) {
  // "YYYY-MM-DD" -> "YYYY-MM-01"
  const y = d.slice(0, 4);
  const m = d.slice(5, 7);
  return `${y}-${m}-01`;
}

export async function createManualCashFlow(input: Input): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (!input.cashAccountId) throw new Error("cashAccountId が不正です");
  if (!input.cashCategoryId) throw new Error("カテゴリは必須です");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("金額が不正です");
  if (!input.date) throw new Error("日付が不正です");

  const { error: insErr } = await supabase.from("cash_flows").insert({
    date: input.date,
    section: input.section, // income / expense
    amount: input.amount,
    description: input.description,
    cash_account_id: input.cashAccountId,
    cash_category_id: input.cashCategoryId,
    source_type: "manual",
  });

  if (insErr) throw new Error(insErr.message);

  // 月次再計算（あなたが作った関数を呼ぶ）
  const { error: rpcErr } = await supabase.rpc("recalc_monthly_cash_balance", {
    p_cash_account_id: input.cashAccountId,
    p_month: monthStart(input.date),
  });

  if (rpcErr) throw new Error(rpcErr.message);
}