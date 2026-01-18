// app/dashboard/_actions/getCashCategories.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashCategory } from "../_types";

export async function getCashCategories(): Promise<CashCategory[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cash_categories")
    .select("id, name")
    .order("id", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    name: String(r.name),
  }));
}