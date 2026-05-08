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

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  const orgId = toNumber((user as any)?.user_metadata?.org_id, 0);
  if (!orgId) throw new Error("org_id not found in user metadata");

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
