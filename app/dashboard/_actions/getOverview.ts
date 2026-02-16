// app/dashboard/_actions/getOverview.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { OverviewPayload } from "../_types";

type Input = {
  cashAccountId: number; // 0 = all
  month: string; // YYYY-MM-01
};

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function isIncome(v: unknown) {
  const s = String(v ?? "");
  return s === "in" || s === "income" || s === "収入";
}
function isExpense(v: unknown) {
  const s = String(v ?? "");
  return s === "out" || s === "expense" || s === "支出";
}

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function getOverview(input: Input): Promise<OverviewPayload> {
  const supabase = await createClient();

  const cashAccountId = Number(input.cashAccountId);
  const monthStart = new Date(input.month);
  if (Number.isNaN(monthStart.getTime())) {
    throw new Error("month が不正です（YYYY-MM-01）");
  }

  const nextMonth = addMonths(monthStart, 1);
  const from = monthStart.toISOString().slice(0, 10);
  const toExclusive = nextMonth.toISOString().slice(0, 10);

  // -----------------------------
  // 0) 対象 org_id を確定
  // -----------------------------
  let orgId: number | null = null;

  if (cashAccountId !== 0) {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("org_id")
      .eq("id", cashAccountId)
      .maybeSingle();

    if (error) throw error;
    orgId = (data as any)?.org_id ?? null;
  } else {
    const { data, error } = await supabase
      .from("org_members")
      .select("org_id")
      .order("org_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    orgId = (data as any)?.org_id ?? null;
  }

  // -----------------------------
  // 1) 固定費（月額合計）を org 単位で取得
  // -----------------------------
  let fixedMonthlyCost = 0;

  if (orgId != null) {
    const { data, error } = await supabase
      .from("fixed_cost_totals")
      .select("total_monthly_fixed_cost")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!error) {
      fixedMonthlyCost = toNumber((data as any)?.total_monthly_fixed_cost);
    } else {
      const { data: items, error: itemsErr } = await supabase
        .from("fixed_cost_items")
        .select("monthly_amount, enabled, org_id")
        .eq("org_id", orgId);

      if (!itemsErr) {
        fixedMonthlyCost = (items ?? []).reduce((sum: number, r: any) => {
          const enabled = r?.enabled !== false;
          const amt = toNumber(r?.monthly_amount);
          return sum + (enabled ? amt : 0);
        }, 0);
      } else {
        fixedMonthlyCost = 0;
      }
    }
  }

  // -----------------------------
  // 2) 口座名・残高
  // -----------------------------
  let accountName = "全口座";
  let currentBalance = 0;

  if (cashAccountId === 0) {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("current_balance");
    if (error) throw error;
    currentBalance = (data ?? []).reduce(
      (sum: number, r: any) => sum + toNumber(r.current_balance),
      0
    );
  } else {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("name, current_balance")
      .eq("id", cashAccountId)
      .maybeSingle();
    if (error) throw error;

    accountName = data?.name ?? `口座ID:${cashAccountId}`;
    currentBalance = toNumber((data as any)?.current_balance);
  }

  // -----------------------------
  // 3) 今月の in/out
  // -----------------------------
  let q = supabase
    .from("cash_flows")
    .select("type, section, amount")
    .gte("date", from)
    .lt("date", toExclusive);

  if (cashAccountId !== 0) q = q.eq("cash_account_id", cashAccountId);

  const { data: flows, error: flowsError } = await q;
  if (flowsError) throw flowsError;

  let thisMonthIncome = 0;
  let thisMonthExpense = 0;

  for (const r of flows ?? []) {
    const t = (r as any).type;
    const s = (r as any).section;
    const amount = toNumber((r as any).amount);

    // 収入はそのまま加算（通常プラスで保存される想定）
    if (isIncome(s) || isIncome(t)) thisMonthIncome += amount;

    // 支出は符号に依存しないよう abs で加算
    if (isExpense(s) || isExpense(t)) thisMonthExpense += Math.abs(amount);
  }

  const net = thisMonthIncome - thisMonthExpense;

  return {
    accountName,
    currentBalance: Math.round(currentBalance),
    thisMonthIncome: Math.round(thisMonthIncome),
    thisMonthExpense: Math.round(thisMonthExpense),
    net: Math.round(net),

    fixedMonthlyCost: Math.round(fixedMonthlyCost),
  } as OverviewPayload;
}