// app/dashboard/_actions/getOpeningBalance.ts （新規でもOK）
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

export async function getOpeningBalance(params: { cashAccountId: number }): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const cashAccountId = Number(params.cashAccountId);

  const { data: account, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, org_id")
    .eq("id", cashAccountId)
    .maybeSingle();

  if (accErr || !account) return 0;

  const orgId = toNumber((account as any).org_id, 0);
  if (!orgId) return 0;

  const { data: flows, error: flowsErr } = await supabase
    .from("cash_flows")
    .select("amount, section, cash_category_id, source_type")
    .eq("org_id", orgId)
    .eq("cash_account_id", cashAccountId);

  if (flowsErr) return 0;

  const catIds = Array.from(
    new Set((flows ?? []).map((r: any) => r.cash_category_id).filter(Boolean))
  ) as number[];

  const { data: cats, error: catErr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .in("id", catIds);

  if (catErr) return 0;

  const nameById = new Map<number, string>();
  (cats ?? []).forEach((c: any) => nameById.set(toNumber(c.id, 0), String(c.name ?? "")));

  let opening = 0;
  for (const r of flows ?? []) {
    const catName = r.cash_category_id ? nameById.get(toNumber(r.cash_category_id, 0)) ?? "" : "";
    if (catName !== "初期値") continue;
    if (r.source_type !== "manual") continue;

    const amt = toNumber(r.amount, 0);
    const signed = r.section === "expense" ? -amt : amt;
    opening += signed;
  }
  return opening;
}