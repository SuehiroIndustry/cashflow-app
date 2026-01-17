"use server";

import { createClient } from "@/utils/supabase/server";
import type { AccountOption, CategoryOption } from "../_types";

export async function getAccountsAndCategories(): Promise<{
  accounts: AccountOption[];
  categories: CategoryOption[];
}> {
  const supabase = await createClient();

  // accounts
  const { data: acc, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id,name,kind")
    .order("id", { ascending: true });
  if (accErr) throw accErr;

  // categories（今は全件でOK。ユーザー別ON/OFFは次の段階で settings を噛ませる）
  const { data: cat, error: catErr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("id", { ascending: true });
  if (catErr) throw catErr;

  return {
    accounts: (acc ?? []) as any,
    categories: (cat ?? []) as any,
  };
}