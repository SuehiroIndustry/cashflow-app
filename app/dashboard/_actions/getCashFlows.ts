// app/dashboard/_actions/getCashFlows.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashFlowListRow } from "../_types";

/**
 * 指定月（YYYY-MM）に属する cash_flows を返す
 * - user_id は返さない（不要・あなたの前提）
 * - category 名は cash_categories を join して返す
 */
export async function getCashFlows(args: {
  cash_account_id: number;
  month: string; // YYYY-MM
}): Promise<CashFlowListRow[]> {
  const supabase = createClient();

  // auth（RLS 前提）
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  // month: YYYY-MM -> start/end（YYYY-MM-DD）
  const start = `${args.month}-01`;
  const d = new Date(`${args.month}-01T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid month format");
  d.setUTCMonth(d.getUTCMonth() + 1);
  const end = d.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      `
      id,
      cash_account_id,
      date,
      section,
      amount,
      cash_category_id,
      description,
      created_at,
      cash_category:cash_categories (
        id,
        name
      )
    `
    )
    .eq("cash_account_id", args.cash_account_id)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;

  // Supabase の返却は型推論が弱いので、最終形だけ合わせる
  // （ただし client 側で as 乱用しないため、ここで責任持つ）
  return (data ?? []) as unknown as CashFlowListRow[];
}