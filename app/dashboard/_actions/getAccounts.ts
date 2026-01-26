// app/dashboard/_actions/getAccounts.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .order("id", { ascending: true });

  if (error) {
    console.error("[getAccounts] error:", error);
    return [];
  }

  // ✅ 型ズレ殺し（id が string でも number に矯正）
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    name: String(r.name ?? ""),
    current_balance: Number(r.current_balance ?? 0),
  }));
}