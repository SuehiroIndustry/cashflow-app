// app/transactions/_actions/getRecentCashFlows.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export type RecentCashFlowRow = {
  id: number;
  date: string; // YYYY-MM-DD
  section: "in" | "out";
  amount: number;
  cash_category_id: number | null;
  cash_category_name: string | null;
  description: string | null;
};

export async function getRecentCashFlows(input: { cashAccountId: number; limit?: number }) {
  const supabase = await createClient();
  const limit = input.limit ?? 30;

  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      `
      id,
      date,
      section,
      amount,
      cash_category_id,
      description,
      cash_categories:cash_category_id ( name )
    `
    )
    .eq("cash_account_id", input.cashAccountId)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id as number,
    date: r.date as string,
    section: r.section as "in" | "out",
    amount: Number(r.amount),
    cash_category_id: (r.cash_category_id ?? null) as number | null,
    cash_category_name: (r.cash_categories?.name ?? null) as string | null,
    description: (r.description ?? null) as string | null,
  })) satisfies RecentCashFlowRow[];
}