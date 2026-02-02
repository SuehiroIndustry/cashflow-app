// app/dashboard/import/_actions/importCashFlowsFromRows.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type Row = {
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  description: string;
};

export async function importCashFlowsFromRows(params: {
  cashAccountId: number;
  rows: Row[];
}): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: "未ログインです" };

  const cashAccountId = params.cashAccountId;
  if (!cashAccountId) return { ok: false, error: "cashAccountId がありません" };

  // 取り込み用に正規化
  const payload = (params.rows ?? [])
    .filter((r) => r && r.date && r.section && Number.isFinite(r.amount))
    .map((r) => ({
      user_id: user.id,
      cash_account_id: cashAccountId,
      date: r.date,
      section: r.section, // 'income' | 'expense'
      amount: Math.trunc(r.amount),
      description: r.description ?? "",
      source_type: "import_csv",
      // cash_category_id は今回は入れない（manual じゃないので必須制約に当たらない想定）
    }));

  if (!payload.length) return { ok: false, error: "取り込み対象が0件です" };

  const { error } = await supabase.from("cash_flows").insert(payload);

  if (error) {
    console.error("[importCashFlowsFromRows] error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, inserted: payload.length };
}