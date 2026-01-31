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

function normalizeKind(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function isIncome(kind: string) {
  return kind === "in" || kind === "income" || kind === "収入";
}

function isExpense(kind: string) {
  return kind === "out" || kind === "expense" || kind === "支出";
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

  // 現在残高（口座 or 全口座）
  let accountName = "全口座";
  let currentBalance = 0;

  if (cashAccountId === 0) {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("current_balance");
    if (error) throw error;
    currentBalance = (data ?? []).reduce(
      (sum: number, r: any) => sum + Number(r.current_balance ?? 0),
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
    currentBalance = Number(data?.current_balance ?? 0);
  }

  // ✅ 今月の in/out（section / type 両対応）
  // ※ cash_flows の実体が type カラムでも動く
  let q = supabase
    .from("cash_flows")
    .select("amount, section, type, kind")
    .gte("date", from)
    .lt("date", toExclusive);

  if (cashAccountId !== 0) q = q.eq("cash_account_id", cashAccountId);

  const { data: flows, error: flowsError } = await q;
  if (flowsError) throw flowsError;

  let thisMonthIncome = 0;
  let thisMonthExpense = 0;

  for (const r of flows ?? []) {
    const rawKind =
      (r as any).section ?? (r as any).type ?? (r as any).kind ?? "";
    const kind = normalizeKind(rawKind);

    // 日本語は lowerCase で壊れるので原文も見る
    const kindRaw = String(rawKind ?? "").trim();

    const amount = Number((r as any).amount ?? 0);

    if (isIncome(kind) || isIncome(kindRaw)) thisMonthIncome += amount;
    if (isExpense(kind) || isExpense(kindRaw)) thisMonthExpense += amount;
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