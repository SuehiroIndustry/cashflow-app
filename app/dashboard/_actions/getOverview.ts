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

function normalizeSection(raw: unknown): "in" | "out" | "unknown" {
  const s = String(raw ?? "").trim().toLowerCase();

  // ✅ 収入系
  if (s === "in" || s === "income" || s === "収入" || s === "入金") return "in";

  // ✅ 支出系
  if (s === "out" || s === "expense" || s === "支出" || s === "出金") return "out";

  return "unknown";
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

  // =========================
  // 現在残高（口座 or 全口座）
  // =========================
  let accountName = "全口座";
  let currentBalance = 0;

  if (cashAccountId === 0) {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("current_balance");
    if (error) throw error;

    currentBalance = (data ?? []).reduce((sum: number, r: any) => {
      return sum + Number(r.current_balance ?? 0);
    }, 0);
  } else {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("name, current_balance")
      .eq("id", cashAccountId)
      .maybeSingle();
    if (error) throw error;

    accountName = data?.name ?? `口座ID:${cashAccountId}`;
    currentBalance = Number(data?.current_balance ?? 0);
  }

  // =========================
  // 今月の in/out
  // =========================
  let q = supabase
    .from("cash_flows")
    .select("section, amount")
    .gte("date", from)
    .lt("date", toExclusive);

  if (cashAccountId !== 0) q = q.eq("cash_account_id", cashAccountId);

  const { data: flows, error: flowsError } = await q;
  if (flowsError) throw flowsError;

  let thisMonthIncome = 0;
  let thisMonthExpense = 0;

  for (const r of flows ?? []) {
    const section = normalizeSection((r as any).section);
    const amount = Number((r as any).amount ?? 0);

    if (!Number.isFinite(amount)) continue;

    if (section === "in") thisMonthIncome += amount;
    if (section === "out") thisMonthExpense += amount;
  }

  const net = thisMonthIncome - thisMonthExpense;

  return {
    accountName,
    currentBalance: Math.round(currentBalance),
    thisMonthIncome: Math.round(thisMonthIncome),
    thisMonthExpense: Math.round(thisMonthExpense),
    net: Math.round(net),
  };
}