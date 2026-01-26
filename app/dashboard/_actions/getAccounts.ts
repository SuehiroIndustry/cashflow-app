// app/dashboard/_actions/getAccounts.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .order("id");

  if (error) {
    console.error("getAccounts error:", error);
    return [];
  }

  return data ?? [];
}