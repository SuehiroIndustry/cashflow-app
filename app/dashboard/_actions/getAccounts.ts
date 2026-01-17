"use server";

import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";

export type AccountRow = {
  id: string;
  name: string;
  type: string; // 'cash' | 'bank' | ... (DBに合わせて)
  currency: string; // 'JPY' etc
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
};

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = createServerComponentClient({ cookies });

  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, currency, is_active, is_default, created_at")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    // ここでthrowしてもOKだけど、UI崩壊を防ぐなら空配列返すのが堅い
    console.error("[getAccounts] error:", error.message);
    return [];
  }

  return (data ?? []) as AccountRow[];
}