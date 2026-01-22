// app/dashboard/_actions/getCashShortForecast.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type {
  CashShortForecast,
  CashShortForecastInput,
  CashProjectionMonthRow,
} from "../_types";

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
              } catch {}
            });
          } catch {}
        },
      },
    }
  );
}

function addMonthsISO(monthISO: string, add: number) {
  // monthISO: "YYYY-MM-01"
  const [y, m] = monthISO.split("-").map((v) => Number(v));
  const dt = new Date(y, (m - 1) + add, 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}-01`;
}

export async function getCashShortForecast(
  input: CashShortForecastInput
): Promise<CashShortForecast> {
  const supabase = await getSupabase();

  const { cashAccountId, month, rangeMonths, avgWindowMonths, whatIf } = input;

  // 1) current balance
  const { data: acc, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id, current_balance")
    .eq("id", cashAccountId)
    .maybeSingle();

  if (accErr) throw new Error(accErr.message);
  const currentBalance = Number(acc?.current_balance ?? 0);

  // 2) last N months actuals for averaging
  const { data: rows, error: balErr } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense")
    .eq("cash_account_id", cashAccountId)
    .lte("month", month)
    .order("month", { ascending: false })
    .limit(avgWindowMonths);

  if (balErr) throw new Error(balErr.message);

  const n = rows?.length ?? 0;
  const sumIncome = (rows ?? []).reduce((s: number, r: any) => s + Number(r.income ?? 0), 0);
  const sumExpense = (rows ?? []).reduce((s: number, r: any) => s + Number(r.expense ?? 0), 0);

  const baseAvgIncome = n ? Math.round(sumIncome / n) : 0;
  const baseAvgExpense = n ? Math.round(sumExpense / n) : 0;

  const deltaIncome = Number(whatIf?.deltaIncome ?? 0);
  const deltaExpense = Number(whatIf?.deltaExpense ?? 0);

  const avgIncome = baseAvgIncome + deltaIncome;
  const avgExpense = baseAvgExpense + deltaExpense;
  const avgNet = avgIncome - avgExpense;

  // 3) build projection
  const projection: CashProjectionMonthRow[] = [];
  let bal = currentBalance;
  let shortDate: string | null = null;

  for (let i = 0; i < rangeMonths; i++) {
    const m = addMonthsISO(month, i); // start from selected month
    bal = bal + avgNet;

    if (shortDate === null && bal <= 0) shortDate = m;

    projection.push({
      month: m,
      income: avgIncome,
      expense: avgExpense,
      balance: bal,
    });
  }

  // 4) level + message
  let level: "safe" | "warn" | "danger" = "safe";
  let message = "平均ベースでは残高は減りません（ただし変動は別途）";

  if (shortDate) {
    // months until short
    const idx = projection.findIndex((r) => r.month === shortDate);
    if (idx >= 0 && idx <= 1) {
      level = "danger";
      message = "かなり危険。直近で資金ショート見込みです。";
    } else if (idx >= 0 && idx <= 3) {
      level = "warn";
      message = "注意。数ヶ月以内に資金ショートの可能性があります。";
    } else {
      level = "warn";
      message = "今すぐではないが、放置すると資金ショートします。";
    }
  }

  return {
    cashAccountId,
    month,
    rangeMonths,
    avgWindowMonths,
    avgIncome,
    avgExpense,
    avgNet,
    level,
    message,
    shortDate,
    rows: projection,
  };
}