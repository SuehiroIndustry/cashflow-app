// app/dashboard/statement/_actions/getCashFlows.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CashFlowListRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: string; // '収入' | '支出' etc
  amount: number;
  description: string | null;
  source_type: string; // 'import' | 'manual' etc
  created_at: string;
};

export async function getCashFlows(params: {
  cashAccountId: number;
  sourceType?: string; // default 'import'
  limit?: number; // default 200
}): Promise<CashFlowListRow[]> {
  const supabase = await createSupabaseServerClient();

  const sourceType = params.sourceType ?? "import";
  const limit = params.limit ?? 200;

  const { data, error } = await supabase
    .from("cash_flows")
    .select("id, date, section, amount, description, source_type, created_at")
    .eq("cash_account_id", params.cashAccountId)
    .eq("source_type", sourceType)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getCashFlows] error:", error);
    return [];
  }

  return (data ?? []) as CashFlowListRow[];
}