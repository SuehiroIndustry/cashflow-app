// app/dashboard/_actions/getCashCategories.ts
"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { CashCategory } from "../_types";

export async function getCashCategories(): Promise<CashCategory[]> {
  const supabase = await createSupabaseServerClient();

  // auth（ルールに合わせて一応チェック）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("cash_categories")
    .select("id, name")
    .order("id", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: Number(c.id),
    name: String(c.name),
  }));
}