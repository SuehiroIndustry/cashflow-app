"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountRow = {
  id: string;
  name: string;
  type: string;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
};

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