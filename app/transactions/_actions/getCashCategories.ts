// app/transactions/_actions/getCashCategories.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export type CashCategoryOption = { id: number; name: string };

export async function getCashCategories(): Promise<CashCategoryOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_categories")
    .select("id, name")
    .order("id", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r) => ({ id: r.id as number, name: r.name as string }));
}