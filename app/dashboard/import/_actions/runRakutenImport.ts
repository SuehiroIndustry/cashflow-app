// app/dashboard/import/_actions/runRakutenImport.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export type RakutenImportRow = {
  date: string; // YYYY-MM-DD
  section: "収入" | "支出" | "income" | "expense";
  amount: number;
  memo?: string | null;
};

export type RunRakutenImportInput = {
  cashAccountId: number; // ここは 2 固定で渡す
  rows: RakutenImportRow[];
};

export type RunRakutenImportResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string };

function normalizeSection(s: RakutenImportRow["section"]): "収入" | "支出" {
  const v = String(s ?? "").toLowerCase();
  if (v === "income" || v === "in" || v === "収入") return "収入";
  return "支出";
}

function isValidDateYYYYMMDD(s: string) {
  // 雑に弾く（厳密にやりたいなら date-fns 等で）
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function runRakutenImport(
  input: RunRakutenImportInput
): Promise<RunRakutenImportResult> {
  try {
    const supabase = await createClient();

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) return { ok: false, error: authError.message };
    const userId = auth.user?.id;
    if (!userId) return { ok: false, error: "ログイン情報が取得できません" };

    const cashAccountId = Number(input.cashAccountId);
    if (!Number.isFinite(cashAccountId) || cashAccountId <= 0) {
      return { ok: false, error: "cashAccountId が不正です" };
    }

    const rows = (input.rows ?? [])
      .map((r) => ({
        date: String(r.date ?? "").trim(),
        section: normalizeSection(r.section),
        amount: Number(r.amount ?? 0),
        memo: r.memo ? String(r.memo).trim() : null,
      }))
      .filter((r) => isValidDateYYYYMMDD(r.date) && Number.isFinite(r.amount) && r.amount !== 0);

    if (rows.length === 0) {
      return { ok: false, error: "取り込み対象がありません（CSVを確認してください）" };
    }

    // ✅ cash_flows の制約：
    // - source_type NOT NULL（manual 以外ならカテゴリ必須じゃない）
    // → ここでは source_type を 'rakuten_csv' に固定
    const payload = rows.map((r) => ({
      user_id: userId,
      cash_account_id: cashAccountId,
      date: r.date,
      section: r.section, // '収入'/'支出'
      amount: r.amount,
      memo: r.memo,
      source_type: "rakuten_csv",
      cash_category_id: null,
    }));

    const { error } = await supabase.from("cash_flows").insert(payload);
    if (error) return { ok: false, error: error.message };

    return { ok: true, inserted: payload.length };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "取り込みに失敗しました" };
  }
}