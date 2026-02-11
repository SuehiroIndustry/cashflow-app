// app/dashboard/_actions/getDashboardJudge.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMonthlyBalance } from "./getMonthlyBalance";

export type DashboardJudgeLevel = "safe" | "warn" | "short";

export type DashboardJudgeResult = {
  level: DashboardJudgeLevel;
  message: string;

  currentBalance: number;
  avgIncome: number;
  avgExpense: number;
  avgNet: number;
  projectedMin: number;
};

export async function getDashboardJudge(params: {
  cashAccountId: number;
  avgWindowMonths?: number; // default 6
  horizonMonths?: number; // default 12
}): Promise<DashboardJudgeResult> {
  const supabase = await createSupabaseServerClient();

  const avgWindowMonths = params.avgWindowMonths ?? 6;
  const horizonMonths = params.horizonMonths ?? 12;

  // 1) 現在残高
  const { data: acc, error: accErr } = await supabase
    .from("cash_accounts")
    .select("current_balance")
    .eq("id", params.cashAccountId)
    .maybeSingle();

  if (accErr) {
    console.error("[getDashboardJudge] cash_accounts error:", accErr);
  }

  const currentBalance = Number(acc?.current_balance ?? 0);

  // 2) 直近Nヶ月の月次（実績）
  const rows = await getMonthlyBalance({
    cashAccountId: params.cashAccountId,
    months: avgWindowMonths,
  });

  const n = Math.max(1, rows.length);
  const sumIncome = rows.reduce((s, r) => s + Number(r.income ?? 0), 0);
  const sumExpense = rows.reduce((s, r) => s + Number(r.expense ?? 0), 0);

  const avgIncome = sumIncome / n;
  const avgExpense = sumExpense / n;
  const avgNet = avgIncome - avgExpense;

  // 3) Simulationと同じ判定ロジック
  const projectedMin = currentBalance + avgNet * horizonMonths;

  let level: DashboardJudgeLevel = "safe";
  let message =
    "現状の実績（直近6ヶ月平均）では、直近12ヶ月で資金ショートの兆候は強くありません。";

  if (projectedMin < 0) {
    level = "short";
    message =
      "このままの実績（直近6ヶ月平均）だと、12ヶ月以内に資金ショートする可能性が高いです。";
  } else if (currentBalance < 300_000 || avgNet < 0) {
    level = "warn";
    message =
      "残高が薄いか、平均収支がマイナス寄りです。支出の固定費・季節要因を点検してください。";
  }

  return {
    level,
    message,
    currentBalance: Math.round(currentBalance),
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    avgNet: Math.round(avgNet),
    projectedMin: Math.round(projectedMin),
  };
}