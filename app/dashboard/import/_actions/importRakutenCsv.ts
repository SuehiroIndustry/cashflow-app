// app/dashboard/import/_actions/importRakutenCsv.ts
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
  // ✅ 全銀協(Zengin)レコード8から拾った「最終残高」
  endingBalance?: number | null;
}): Promise<{ ok: true; inserted: number; deleted: number } | { ok: false; error: string }> {
  const { cashAccountId, rows, endingBalance } = params;

  if (!cashAccountId) return { ok: false, error: "cashAccountId が不正です" };
  if (!rows || rows.length === 0) return { ok: false, error: "取り込み対象が0件です" };

  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) return { ok: false, error: "ログイン情報が取得できませんでした" };

  // 取り込み期間（洗い替え）
  const dates = rows
    .map((r) => (r?.date ?? "").trim())
    .filter(Boolean)
    .sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  if (!minDate || !maxDate) return { ok: false, error: "日付が不正です" };

  // ✅ 1) 同期間の import を先に削除（これで再インポートしても倍にならない）
  const { data: deletedRows, error: delErr } = await supabase
    .from("cash_flows")
    .delete()
    .eq("cash_account_id", cashAccountId)
    .eq("source_type", "import")
    .gte("date", minDate)
    .lte("date", maxDate)
    .select("id"); // 削除件数カウント用

  if (delErr) {
    console.error("[importRakutenCsv] delete error:", delErr);
    return { ok: false, error: `既存データの削除に失敗しました: ${delErr.message}` };
  }

  // ✅ 2) insert（source_typeは import に統一）
  const payload = rows
    .filter((r) => r && r.date && r.section && Number.isFinite(r.amount))
    .map((r) => ({
      user_id: userId,
      cash_account_id: cashAccountId,
      date: r.date,
      section: r.section,
      amount: Math.abs(Math.trunc(r.amount)),
      description: r.memo ?? "",
      source_type: "import",
    }));

  const { error: insErr } = await supabase.from("cash_flows").insert(payload);

  if (insErr) {
    console.error("[importRakutenCsv] insert error:", insErr);
    return { ok: false, error: insErr.message };
  }

  // ✅ 3) Zenginレコード8の最終残高が渡ってきたら current_balance を更新
  if (typeof endingBalance === "number" && Number.isFinite(endingBalance) && endingBalance >= 0) {
    const { error: balErr } = await supabase
      .from("cash_accounts")
      .update({ current_balance: Math.trunc(endingBalance) })
      .eq("id", cashAccountId);

    if (balErr) {
      console.error("[importRakutenCsv] update current_balance error:", balErr);
      return { ok: false, error: `残高更新に失敗しました: ${balErr.message}` };
    }
  }

  return { ok: true, inserted: payload.length, deleted: deletedRows?.length ?? 0 };
}