// app/dashboard/_actions/getTotalAccountBalance.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function getTotalAccountBalance(): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { data: memberData, error: memberErr } = await supabase
    .from("org_members")
    .select("org_id")
    .order("org_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberErr) throw memberErr;

  const orgId = toNumber((memberData as any)?.org_id, 0);
  if (!orgId) throw new Error("org_id not found in org_members");

  const { data, error } = await supabase
    .from("cash_accounts")
    .select("current_balance")
    .eq("org_id", orgId);

  if (error) {
    console.error("[getTotalAccountBalance] error:", error);
    return 0;
  }

  return (data ?? []).reduce(
    (sum: number, r: any) => sum + toNumber(r.current_balance, 0),
    0
  );
}
