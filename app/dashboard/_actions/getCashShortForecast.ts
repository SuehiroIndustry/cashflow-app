// app/dashboard/_actions/getCashShortForecast.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type {
  CashShortForecast,
  GetCashShortForecastInput,
} from "../_types";

function addMonths(monthStartISO: string, plusMonths: number): string {
  // monthStartISO: "YYYY-MM-01"
  const d = new Date(monthStartISO + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based
  const newDate = new Date(Date.UTC(y, m + plusMonths, 1));
  const yy = newDate.getUTCFullYear();
  const mm = String(newDate.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function getSupabase() {
  const cookieStore = await Promise.resolve(cookies());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options as any);
              } catch {
                // noop
              }
            });
          } catch {
            // noop
          }
        },
      },
    }
  );
}

export async function getCashShortForecast(
  input: GetCashShortForecastInput
): Promise<CashShortForecast> {
  const { cashAccountId, month, rangeMonths } = input;

  const supabase = await getSupabase();

  // ① 現在残高（cash_accounts）
  const { data: acc, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, current_balance")
    .eq("id", cashAccountId)
    .maybeSingle();

  if (accErr) throw new Error(accErr.message);

  const currentBalance = toNumber(acc?.current_balance ?? 0);

  // ② 月次（monthly_cash_account_balances）: 選択月以前の直近Nヶ月
  const { data: rows, error: rowsErr } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("cash_account_id", cashAccountId)
    .lte("month", month)
    .order("month", { ascending: false })
    .limit(rangeMonths);

  if (rowsErr) throw new Error(rowsErr.message);

  const list = (rows ?? []).map((r: any) => ({
    month: String(r.month),
    income: toNumber(r.income),
    expense: toNumber(r.expense),
    balance: toNumber(r.balance),
  }));

  const count = list.length || 1;
  const sumIncome = list.reduce((a, r) => a + r.income, 0);
  const sumExpense = list.reduce((a, r) => a + r.expense, 0);

  const avgIncome = sumIncome / count;
  const avgExpense = sumExpense / count;
  const avgNet = avgIncome - avgExpense; // 月平均の純増減（＋なら増える、−なら減る）

  // ③ ショート予測
  let monthsToZero: number | null = null;
  let predictedMonth: string | null = null;

  if (currentBalance <= 0) {
    monthsToZero = 0;
    predictedMonth = month;
  } else if (avgNet < 0) {
    const burn = -avgNet; // 月あたり減る額
    monthsToZero = Math.ceil(currentBalance / burn);
    predictedMonth = addMonths(month, monthsToZero);
  }

  // ④ レベル判定（ダッシュボードで色付けする用）
  let level: CashShortForecast["level"] = "safe";
  let message = "資金ショートの兆候は見えていません（平均ベース）";

  if (monthsToZero === 0) {
    level = "danger";
    message = "残高がすでに0以下です。即時の対策が必要です。";
  } else if (typeof monthsToZero === "number") {
    if (monthsToZero <= 3) {
      level = "danger";
      message = `このままだと約${monthsToZero}ヶ月で資金ショート見込みです。`;
    } else if (monthsToZero <= 6) {
      level = "warn";
      message = `このままだと約${monthsToZero}ヶ月で資金ショート見込みです（要注意）。`;
    } else {
      level = "safe";
      message = `平均ベースでは、資金ショートまで約${monthsToZero}ヶ月の余裕があります。`;
    }
  } else {
    // monthsToZero === null（平均で増える or 横ばい）
    level = "safe";
    message = "平均ベースでは残高は減りません（ただし変動は別途）";
  }

  return {
    cashAccountId,
    month,
    rangeMonths,
    currentBalance,
    avgIncome,
    avgExpense,
    avgNet,
    monthsToZero,
    predictedMonth,
    level,
    message,
  };
}