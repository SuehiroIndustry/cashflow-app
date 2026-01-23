// app/dashboard/_actions/getAccounts.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashAccount } from "../_types";

export async function getAccounts(): Promise<CashAccount[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .order("id", { ascending: true });

  if (error) throw error;

  const accounts: CashAccount[] = (data ?? []).map((r: any) => ({
    id: Number(r.id),
    name: String(r.name),
    current_balance: Number(r.current_balance ?? 0),
  }));

  const total = accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return [
    { id: 0, name: "全口座", current_balance: total },
    ...accounts,
  ];
}