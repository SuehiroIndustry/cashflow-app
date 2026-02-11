// app/dashboard/income/_actions/getCategories.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCategories(): Promise<Array<{ id: number; name: string }>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: number; name: string }>;
}