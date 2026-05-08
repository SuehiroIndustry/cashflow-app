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

  // 1) org 配下の全口座と current_balance を取得
  const { data: accounts, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, current_balance")
    .eq("org_id", orgId);

  if (accErr) throw accErr;

  const rows = (accounts ?? []) as { id: number; current_balance: unknown }[];

  // 2) current_balance が 0 / null の口座 ID を収集（マニュアル管理口座）
  //    二重計上を防ぐため、銀行連携口座（current_balance > 0）は cash_flows から拾わない
  const manualAccountIds = rows
    .filter((r) => toNumber(r.current_balance, 0) === 0)
    .map((r) => r.id)
    .filter(Boolean);

  // 3) 銀行連携口座の合計（current_balance > 0 の口座）
  const linkedBalance = rows.reduce(
    (sum, r) => sum + toNumber(r.current_balance, 0),
    0
  );

  // 4) マニュアル口座の現在残高を cash_flows 全件の符号付き合計で算出
  //    getMonthlyBalance と同じロジック：
  //      openingBalance(初期値) + Σ月次ネット = Σ(全cash_flows符号付き合計)
  //    初期値だけを取るのではなく、初期値 + その後の収支すべての累積が現在残高
  let manualBalance = 0;

  if (manualAccountIds.length > 0) {
    const { data: flows, error: flowsErr } = await supabase
      .from("cash_flows")
      .select("amount, section")
      .in("cash_account_id", manualAccountIds);

    if (flowsErr) throw flowsErr;

    for (const r of (flows ?? []) as any[]) {
      const amt = toNumber(r.amount, 0);
      manualBalance += r.section === "expense" ? -amt : amt;
    }
  }

  return linkedBalance + manualBalance;
}
