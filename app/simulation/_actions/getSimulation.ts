// app/simulation/_actions/getSimulation.ts
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getMonthlyBalance } from "@/app/dashboard/_actions/getMonthlyBalance";

export type SimulationLevel = "safe" | "warn" | "danger" | "short";

export type SimulationRow = {
  month: string; // "YYYY-MM"
  projected_balance: number;
  net_assumed: number; // 平均収支（固定）
};

export type GetSimulationInput = {
  cashAccountId: number;
  months?: number; // 参照する過去月数（monthly取得用）
  avgWindowMonths?: number; // 平均計算の窓（例: 6）
  horizonMonths?: number; // 未来予測月数（例: 12）
};

export type SimulationResult = {
  cashAccountId: number;
  accountName: string;
  currentBalance: number;

  avgWindowMonths: number;
  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  horizonMonths: number;
  shortMonth: string | null;

  level: SimulationLevel;
  message: string;

  rows: SimulationRow[];
};

function ym(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export async function getSimulation(
  input: GetSimulationInput
): Promise<SimulationResult> {
  const months = input.months ?? 24;
  const avgWindowMonths = Math.max(1, input.avgWindowMonths ?? 6);
  const horizonMonths = Math.max(1, input.horizonMonths ?? 12);

  const accounts = await getAccounts();
  const account = accounts.find((a) => a.id === input.cashAccountId);
  if (!account) throw new Error("Account not found");

  const monthly = await getMonthlyBalance({
    cashAccountId: input.cashAccountId,
    months,
  });

  // 直近 avgWindowMonths で平均（データが少ない場合はある分だけ）
  const window = monthly.slice(0, avgWindowMonths);
  const denom = Math.max(1, window.length);

  const sumIncome = window.reduce((s, r) => s + Number(r.income ?? 0), 0);
  const sumExpense = window.reduce((s, r) => s + Number(r.expense ?? 0), 0);

  const avgIncome = sumIncome / denom;
  const avgExpense = sumExpense / denom;
  const avgNet = avgIncome - avgExpense;

  const currentBalance = Number(account.current_balance ?? 0);

  // 未来の各月着地（avgNet固定の超シンプルモデル）
  const base = new Date(); // “今” を起点に 1ヶ月後から並べる
  const rows: SimulationRow[] = [];
  let shortMonth: string | null = null;

  for (let i = 1; i <= horizonMonths; i++) {
    const monthKey = ym(addMonths(base, i));
    const projected = Math.round(currentBalance + avgNet * i);

    if (!shortMonth && projected < 0) shortMonth = monthKey;

    rows.push({
      month: monthKey,
      projected_balance: projected,
      net_assumed: Math.round(avgNet),
    });
  }

  // レベル判定（雑でOK、でも判断できる）
  let level: SimulationLevel = "safe";

  if (shortMonth) {
    const idx = rows.findIndex((r) => r.month === shortMonth);
    if (idx >= 0 && idx <= 2) level = "danger";
    else level = "short";
  } else {
    if (avgNet < 0) level = "warn";
  }

  const message =
    level === "danger"
      ? "かなり危険です。3ヶ月以内に資金ショートする可能性があります。"
      : level === "short"
      ? `このままだと ${shortMonth} に資金ショートする可能性があります。`
      : level === "warn"
      ? "平均収支がマイナス傾向です。固定費 or 売上の手当を検討してください。"
      : "現状の傾向では、直近12ヶ月で資金ショートの兆候は強くありません。";

  return {
    cashAccountId: input.cashAccountId,
    accountName: account.name,
    currentBalance,

    avgWindowMonths,
    avgIncome: Math.round(avgIncome),
    avgExpense: Math.round(avgExpense),
    avgNet: Math.round(avgNet),

    horizonMonths,
    shortMonth,

    level,
    message,

    rows,
  };
}