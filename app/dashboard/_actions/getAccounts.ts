"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccountRow } from "../_types";

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, currency, is_active, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getAccounts] error:", error.message);
    return [];
  }

  return (data ?? []) as AccountRow[];
}