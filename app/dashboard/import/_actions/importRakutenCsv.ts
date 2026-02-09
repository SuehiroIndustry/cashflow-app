// app/dashboard/import/_actions/importRakutenCsv.ts
"use server";

import { createSupabaseServerClient } from "../../../../lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, error: "未ログインです" };

  const payload = params.rows.map((r) => ({
    user_id: user.id,
    cash_account_id: params.cashAccountId,
    date: r.date,
    section: r.section,
    amount: Math.abs(Math.trunc(r.amount)),
    memo: r.memo?.slice(0, 200) ?? "",
    source_type: "import" as const,
  }));

  const { error } = await supabase.from("cash_flows").insert(payload);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, inserted: payload.length };
}