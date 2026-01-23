// app/transactions/_actions/getCashCategories.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export type CashCategoryOption = { id: number; name: string };

export async function getCashCategories(): Promise<CashCategoryOption[]> {
  const supabase = await createClient();

  // ※メモ：cash_categories に user_id は無い（前提どおり）
  const { data, error } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({ id: r.id, name: r.name }));
}