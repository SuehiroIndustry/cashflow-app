"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * cash_flows への「手入力（manual）」追加
 * - DB制約に合わせて必須項目を埋める
 * - section は 'in' | 'out'
 * - source_type='manual' のため cash_category_id は必須
 */
export type AddCashFlowInput = {
  cash_account_id: number; // bigint
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number; // numeric
  cash_category_id: number; // bigint（manual必須）
  description?: string | null;
  is_projection?: boolean; // default false
};

export type AddCashFlowResult =
  | { ok: true; data: any }
  | { ok: false; error: string };

function isValidDateYYYYMMDD(s: string) {
  // 超シンプルに形式と実在日をチェック
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // Dateが勝手に繰り上がるケースを排除（例: 2026-02-31）
  const [y, m, day] = s.split("-").map((x) => Number(x));
  return (
    d.getUTCFullYear() === y &&
    d.getUTCMonth() + 1 === m &&
    d.getUTCDate() === day
  );
}

export async function addCashFlow(input: AddCashFlowInput): Promise<AddCashFlowResult> {
  try {
    // --- validate ---
    if (!input) return { ok: false, error: "input is required" };

    const cash_account_id = Number(input.cash_account_id);
    if (!Number.isFinite(cash_account_id) || cash_account_id <= 0) {
      return { ok: false, error: "cash_account_id is invalid" };
    }

    const date = String(input.date ?? "");
    if (!isValidDateYYYYMMDD(date)) {
      return { ok: false, error: "date must be YYYY-MM-DD" };
    }

    const section = input.section;
    if (section !== "in" && section !== "out") {
      return { ok: false, error: "section must be 'in' or 'out'" };
    }

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "amount must be > 0" };
    }

    const cash_category_id = Number(input.cash_category_id);
    if (!Number.isFinite(cash_category_id) || cash_category_id <= 0) {
      return { ok: false, error: "cash_category_id is required for manual" };
    }

    const description =
      input.description === undefined ? null : (input.description ?? null);

    const is_projection = input.is_projection ?? false;

    // --- auth ---
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr) return { ok: false, error: userErr.message };
    const user = userRes?.user;
    if (!user) return { ok: false, error: "not authenticated" };

    // --- insert ---
    const payload = {
      cash_account_id,
      date,                 // date型に自動キャストされる
      type: "manual",       // NOT NULL
      amount,               // NOT NULL
      currency: "JPY",      // NOT NULL
      source_type: "manual",// NOT NULL
      source_id: null,      // nullable
      is_projection,        // NOT NULL
      description,          // nullable
      section,              // 'in' | 'out'（CHECK）
      cash_category_id,     // manual必須（CHECK）
      user_id: user.id,     // NOT NULL
      created_by: user.id,  // nullableだが入れておく（トリガがあるなら上書きされてもOK）
      updated_by: user.id,  // nullable
    };

    const { data, error } = await supabase
      .from("cash_flows")
      .insert(payload)
      .select("*")
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "unknown error" };
  }
}