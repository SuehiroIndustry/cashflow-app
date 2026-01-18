// app/dashboard/_actions/getAccounts.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashAccount } from "../_types";

export async function getAccounts(): Promise<CashAccount[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CashAccount[];
}