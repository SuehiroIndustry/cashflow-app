"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Row = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  memo: string;
};

export async function importRakutenCsv(params: {
  cashAccountId: number;
  rows: Row[];
}): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const { cashAccountId, rows } = params;

  if (!cashAccountId) return { ok: false, error: "cashAccountId が不正です" };
  if (!rows || rows.length === 0) return { ok: false, error: "取り込み対象が0件です" };

  const supabase = await createSupabaseServerClient();

  // user_id は server client で auth から取れる想定（RLSに合わせる）
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { ok: false, error: "ログイン情報が取得できませんでした" };

  // ✅ memo列ではなく description 列に入れる
  const payload = rows.map((r) => ({
    user_id: userId,
    cash_account_id: cashAccountId,
    date: r.date,
    section: r.section,
    amount: r.amount,
    description: r.memo ?? "", // ←ここがポイント
    source_type: "import", // NOT NULL 対策
  }));

  const { error } = await supabase.from("cash_flows").insert(payload);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, inserted: payload.length };
}