"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function monthStart(d: string) {
  const y = d.slice(0, 4);
  const m = d.slice(5, 7);
  return `${y}-${m}-01`;
}

type Input = {
  cashFlowId: number;
};

export async function deleteManualCashFlow(input: Input): Promise<void> {
  const supabase = await createSupabaseServerClient();

  if (!Number.isFinite(input.cashFlowId) || input.cashFlowId <= 0) {
    throw new Error("cashFlowId が不正です");
  }

  // 削除前に行を取得（recalc とガード用）
  const { data: row, error: selErr } = await supabase
    .from("cash_flows")
    .select("id, user_id, cash_account_id, date, source_type")
    .eq("id", input.cashFlowId)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("対象データが見つかりません");

  // 手入力だけ削除可（事故防止）
  if (row.source_type !== "manual") {
    throw new Error("このデータは削除できません（手入力のみ削除可）");
  }

  // 本人のデータだけ削除可
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  const uid = userRes.user?.id;
  if (!uid) throw new Error("ログイン情報が取得できません");

  if (row.user_id !== uid) {
    throw new Error("このデータは削除できません");
  }

  const { error: delErr } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", input.cashFlowId);

  if (delErr) throw new Error(delErr.message);

  // 月次再計算
  const date10 = String(row.date).slice(0, 10);
  const { error: rpcErr } = await supabase.rpc("recalc_monthly_cash_balance", {
    p_cash_account_id: row.cash_account_id,
    p_month: monthStart(date10),
  });

  if (rpcErr) throw new Error(rpcErr.message);
}