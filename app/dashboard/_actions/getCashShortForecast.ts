// app/dashboard/_actions/getCashShortForecast.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashShortForecast, CashShortForecastInput } from "../_types";

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function ym(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function getCashShortForecast(input: CashShortForecastInput): Promise<CashShortForecast> {
  const supabase = await createClient();

  const cashAccountId = Number(input.cashAccountId);
  const rangeMonths = Math.max(1, Number(input.rangeMonths || 12));
  const avgWindowMonths = Math.max(1, Number(input.avgWindowMonths || 6));

  const monthStart = new Date(input.month);
  if (Number.isNaN(monthStart.getTime())) {
    throw new Error("month が不正です（YYYY-MM-01）");
  }

  // 現在残高（口座 or 全口座）
  let currentBalance = 0;

  if (cashAccountId === 0) {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("current_balance");
    if (error) throw error;

    currentBalance = (data ?? []).reduce((sum: number, r: any) => sum + Number(r.current_balance ?? 0), 0);
  } else {
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("current_balance")
      .eq("id", cashAccountId)
      .maybeSingle();
    if (error) throw error;

    currentBalance = Number(data?.current_balance ?? 0);
  }

  // 平均算出期間（直近 avgWindowMonths ヶ月：monthStart から過去へ）
  const windowStart = addMonths(monthStart, -avgWindowMonths);
  const windowEndExclusive = monthStart;

  let q = supabase
    .from("cash_flows")
    .select("section, amount, date")
    .gte("date", windowStart.toISOString().slice(0, 10))
    .lt("date", windowEndExclusive.toISOString().slice(0, 10));

  if (cashAccountId !== 0) {
    q = q.eq("cash_account_id", cashAccountId);
  }

  const { data: flows, error } = await q;
  if (error) throw error;

  let sumIncome = 0;
  let sumExpense = 0;

  for (const r of flows ?? []) {
    const section = String((r as any).section);
    const amount = Number((r as any).amount ?? 0);
    if (section === "in") sumIncome += amount;
    if (section === "out") sumExpense += amount;
  }

  const avgIncome = sumIncome / avgWindowMonths;
  const avgExpense = sumExpense / avgWindowMonths;
  const avgNet = avgIncome - avgExpense;

  // 予測
  let level: CashShortForecast["level"] = "safe";
  let shortDate: string | null = null;

  // “最初にマイナスになる月” を探す
  let projected = currentBalance;

  for (let i = 1; i <= rangeMonths; i++) {
    projected += avgNet;
    if (projected < 0) {
      shortDate = ym(addMonths(monthStart, i - 1));
      level = "danger";
      break;
    }
  }

  // warn 判定（ショートはしないが、平均がマイナス or 余裕が薄い）
  if (level !== "danger") {
    if (avgNet < 0) level = "warn";
    // なんとなく “3ヶ月分の支出” きってたら注意、みたいな雑な現場ルール
    if (currentBalance < avgExpense * 3) level = "warn";
  }

  const message =
    level === "danger"
      ? "このままだと資金ショートの可能性が高いです。支出の固定費・入金サイトを最優先で見直しましょう。"
      : level === "warn"
        ? "直近の傾向だと余裕が薄いです。大きい支出・入金遅れが重なる月を想定して備えましょう。"
        : "現状の傾向では大きな危険信号は出ていません。";

  return {
    level,
    message,
    month: input.month,
    rangeMonths,
    avgWindowMonths,
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    avgNet: Math.round(avgNet),
    shortDate,
  };
}