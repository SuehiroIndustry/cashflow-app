"use server";

import { createClient } from "@/utils/supabase/server";

export type CashFlowRow = {
  id: number;
  date: string;
  section: "in" | "out";
  amount: number;
  description: string | null;
  cash_account_id: number;
  cash_category_id: number;
  cash_account_name: string | null;
  cash_category_name: string | null;
};

export async function getRecentCashFlows(params: {
  cashAccountId: number | null;
  limit?: number;
}) {
  const { cashAccountId, limit = 30 } = params;

  const supabase = await createClient();

  // 口座未選択なら空
  if (!cashAccountId) return [];

  // ここは View を切ってもいいけど、まずは素直に2回でOK
  const { data: flows, error } = await supabase
    .from("cash_flows")
    .select("id,date,section,amount,description,cash_account_id,cash_category_id")
    .eq("cash_account_id", cashAccountId)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!flows) return [];

  // 口座名
  const { data: accounts, error: aerr } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .in("id", Array.from(new Set(flows.map((f) => f.cash_account_id))));

  if (aerr) throw new Error(aerr.message);

  // カテゴリ名
  const { data: cats, error: cerr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .in("id", Array.from(new Set(flows.map((f) => f.cash_category_id))));

  if (cerr) throw new Error(cerr.message);

  const accountMap = new Map<number, string>((accounts ?? []).map((a) => [a.id, a.name]));
  const catMap = new Map<number, string>((cats ?? []).map((c) => [c.id, c.name]));

  const rows: CashFlowRow[] = flows.map((f) => ({
    ...f,
    cash_account_name: accountMap.get(f.cash_account_id) ?? null,
    cash_category_name: catMap.get(f.cash_category_id) ?? null,
  }));

  return rows;
}