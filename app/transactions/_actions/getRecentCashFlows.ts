// app/transactions/_actions/getRecentCashFlows.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { RecentCashFlowRow } from "../_types";

export async function getRecentCashFlows(params: {
  cashAccountId: number;
  limit?: number;
}): Promise<RecentCashFlowRow[]> {
  const { cashAccountId, limit = 30 } = params;

  const supabase = await createClient();

  // cash_flows -> cash_categories を join して category name を取得
  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      `
        id,
        date,
        section,
        amount,
        description,
        cash_categories ( name )
      `
    )
    .eq("cash_account_id", cashAccountId)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    date: r.date,
    section: r.section,
    amount: r.amount,
    categoryName: r.cash_categories?.name ?? "(未設定)",
    description: r.description ?? null,
  }));
}