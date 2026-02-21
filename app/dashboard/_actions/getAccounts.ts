// app/dashboard/_actions/getAccounts.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function getAccounts(): Promise<AccountRow[]> {
  const supabase = await createSupabaseServerClient();

  // ✅ id=2（共有メイン口座）だけ返す
  const { data, error } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .eq("id", 2)
    .order("id", { ascending: true });

  if (error) {
    console.error("[getAccounts] error:", error);
    return [];
  }

  return (data ?? []).map((r: any) => ({
    id: toNumber(r.id),
    name: String(r.name ?? ""),
    current_balance: toNumber(r.current_balance, 0),
  }));
}