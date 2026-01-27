// app/simulation/_actions/getSimulation.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type SimulationLevel = "safe" | "warn" | "danger" | "short";

export type SimulationResult = {
  accountName: string; // "全口座" or 口座名
  currentBalance: number;
  avgIncome: number;
  avgExpense: number;
  avgNet: number;
  level: SimulationLevel;
  message: string;
  months: Array<{ month: string }>; // 予測用キー
};

type Input = {
  cashAccountId: number; // 0=全口座
  months: number; // 月次取得のため（例:24）
  avgWindowMonths: number; // 平均対象（例:6）
  horizonMonths: number; // 予測表示（例:12）
};

function toMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildFutureMonths(count: number) {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + 1);

  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(base);
    d.setMonth(base.getMonth() + i);
    return { month: toMonthKey(d) };
  });
}

export async function getSimulation(input: Input): Promise<SimulationResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // server action内ではno-op
        },
      },
    }
  );

  const isAll = input.cashAccountId === 0;

  // 1) accounts（残高の元）
  const { data: accounts, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id,name,current_balance");

  if (accErr) throw new Error(accErr.message);

  const targetAccounts = isAll
    ? accounts ?? []
    : (accounts ?? []).filter((a) => Number(a.id) === Number(input.cashAccountId));

  const accountName = isAll ? "全口座" : targetAccounts[0]?.name ?? "—";
  const currentBalance = (targetAccounts ?? []).reduce(
    (sum, a) => sum + Number(a.current_balance ?? 0),
    0
  );

  // 2) monthly balances（直近Nヶ月）
  const q = supabase
    .from("monthly_cash_account_balances")
    .select("month,income,expense,balance,cash_account_id")
    .order("month", { ascending: false })
    .limit(Math.max(1, input.months));

  const { data: monthlyRaw, error: mErr } = isAll
    ? await q
    : await q.eq("cash_account_id", input.cashAccountId);

  if (mErr) throw new Error(mErr.message);

  const monthly = monthlyRaw ?? [];

  // 3) 全口座なら「月で集約（SUM）」する
  const byMonth = new Map<
    string,
    { month: string; income: number; expense: number; balance: number }
  >();

  for (const r of monthly) {
    const key = String(r.month).slice(0, 10); // "YYYY-MM-01"想定
    const cur = byMonth.get(key) ?? { month: key, income: 0, expense: 0, balance: 0 };
    cur.income += Number(r.income ?? 0);
    cur.expense += Number(r.expense ?? 0);
    cur.balance += Number(r.balance ?? 0);
    byMonth.set(key, cur);
  }

  const merged = Array.from(byMonth.values()).sort((a, b) =>
    a.month < b.month ? 1 : a.month > b.month ? -1 : 0
  );

  // 4) 平均（直近avgWindowMonths）
  const window = merged.slice(0, Math.max(1, input.avgWindowMonths));
  const avgIncome =
    window.length === 0 ? 0 : window.reduce((s, r) => s + r.income, 0) / window.length;
  const avgExpense =
    window.length === 0 ? 0 : window.reduce((s, r) => s + r.expense, 0) / window.length;

  const avgNet = avgIncome - avgExpense;

  // 5) 判定（ざっくり）
  //    - avgNetがマイナスで、12ヶ月で残高が割れるなら short
  //    - 現残高が薄い or avgNetがちょいマイナスなら warn
  let level: SimulationLevel = "safe";
  let message = "現状の傾向では、直近12ヶ月で資金ショートの兆候は強くありません。";

  const horizon = Math.max(1, input.horizonMonths);
  const projectedMin = currentBalance + avgNet * horizon;

  if (projectedMin < 0) {
    level = "short";
    message =
      "このままの傾向（平均の収支）だと、12ヶ月以内に資金ショートする可能性が高いです。";
  } else if (currentBalance < 300_000 || avgNet < 0) {
    level = "warn";
    message =
      "残高が薄いか、平均収支がマイナス寄りです。支出の固定費・季節要因を点検してください。";
  }

  return {
    accountName,
    currentBalance: Math.round(currentBalance),
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    avgNet: Math.round(avgNet),
    level,
    message,
    months: buildFutureMonths(horizon),
  };
}