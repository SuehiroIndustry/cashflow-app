// app/dashboard/income/_actions/deleteManualCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Input = {
  cashFlowId: number;
  cashAccountId: number;
  date: string; // YYYY-MM-DD
};

function monthStart(d: string) {
  const y = d.slice(0, 4);
  const m = d.slice(5, 7);
  return `${y}-${m}-01`;
}

export async function deleteManualCashFlow(input: Input): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (!input.cashFlowId) throw new Error("cashFlowId が不正です");
  if (!input.cashAccountId) throw new Error("cashAccountId が不正です");
  if (!input.date) throw new Error("date が不正です");

  // ✅ 1) 対象行を確認（manual だけが対象）
  const { data: row, error: rowErr } = await supabase
    .from("cash_flows")
    .select("id, source_type, cash_category_id")
    .eq("id", input.cashFlowId)
    .maybeSingle();

  if (rowErr) throw new Error(rowErr.message);
  if (!row) throw new Error("対象データが見つかりません");
  if (row.source_type !== "manual") throw new Error("manual 以外は削除できません");

  // ✅ カテゴリ未設定は想定外（保険）
  if (!row.cash_category_id) {
    throw new Error("カテゴリ未設定のため削除できません");
  }

  // ✅ 2) カテゴリが「初期値」なら削除禁止
  const { data: cat, error: catErr } = await supabase
    .from("cash_categories")
    .select("name")
    .eq("id", row.cash_category_id)
    .maybeSingle();

  if (catErr) throw new Error(catErr.message);

  if ((cat?.name ?? "") === "初期値") {
    throw new Error("「初期値」カテゴリは削除できません");
  }

  // ✅ manual のみ削除可（インポート等は削除不可）
  const { error: delErr } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", input.cashFlowId)
    .eq("source_type", "manual");

  if (delErr) throw new Error(delErr.message);

  // ✅ 月次再計算
  const { error: rpcErr } = await supabase.rpc("recalc_monthly_cash_balance", {
    p_cash_account_id: input.cashAccountId,
    p_month: monthStart(input.date),
  });

  if (rpcErr) throw new Error(rpcErr.message);
}