// app/dashboard/import/_actions/importCashFlows.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type InRow = {
  date: string;
  section: "income" | "expense";
  amount: number;
  description: string;
};

export async function importCashFlowsFromRows(params: {
  cashAccountId: number;
  rows: InRow[];
}): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return { ok: false, error: "未ログインのため取り込めません。" };
  }

  const payload = params.rows.map((r) => ({
    cash_account_id: params.cashAccountId,
    date: r.date,
    section: r.section,
    amount: r.amount,
    description: r.description,
    source_type: "bank_import", // ✅ manual回避（カテゴリ必須制約回避）
  }));

  const { error } = await supabase.from("cash_flows").insert(payload);

  if (error) {
    return { ok: false, error: `DB insert 失敗: ${error.message}` };
  }

  return { ok: true, inserted: payload.length };
}