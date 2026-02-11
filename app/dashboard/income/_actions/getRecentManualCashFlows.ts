"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ManualCashFlowRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: "income" | "expense";
  amount: number;
  description: string | null;
  cash_account_id: number;
  cash_category_id: number;
  created_at: string | null;
};

export async function getRecentManualCashFlows(params?: {
  limit?: number;
}): Promise<ManualCashFlowRow[]> {
  const supabase = await createSupabaseServerClient();
  const limit = Math.min(Math.max(params?.limit ?? 30, 1), 200);

  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      "id,date,section,amount,description,cash_account_id,cash_category_id,created_at,source_type"
    )
    .eq("source_type", "manual")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  // source_type は select に含めたけど返却型には含めない
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    date: String(r.date).slice(0, 10),
    section: r.section as "income" | "expense",
    amount: Number(r.amount ?? 0),
    description: (r.description ?? null) as string | null,
    cash_account_id: Number(r.cash_account_id),
    cash_category_id: Number(r.cash_category_id),
    created_at: r.created_at ?? null,
  }));
}