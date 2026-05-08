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

  // 1) 楽天連携口座の残高合計（cash_accounts.current_balance）
  const { data: accounts, error: accErr } = await supabase
    .from("cash_accounts")
    .select("current_balance")
    .eq("org_id", orgId);

  if (accErr) throw accErr;

  const linkedBalance = (accounts ?? []).reduce(
    (sum: number, r: any) => sum + toNumber(r.current_balance, 0),
    0
  );

  // 2) マニュアル口座の現在残高（cash_accounts master レコードは存在しない）
  //    org_id 配下の source_type='manual' の cash_flows を符号付きで累積
  //    getMonthlyBalance と同じ計算：初期値 + Σ収支 = Σ(全cash_flows符号付き合計)
  const { data: flows, error: flowsErr } = await supabase
    .from("cash_flows")
    .select("amount, section")
    .eq("org_id", orgId)
    .eq("source_type", "manual");

  if (flowsErr) throw flowsErr;

  const manualBalance = (flows ?? []).reduce((sum: number, r: any) => {
    const amt = toNumber(r.amount, 0);
    return sum + (r.section === "expense" ? -amt : amt);
  }, 0);

  return linkedBalance + manualBalance;
}
