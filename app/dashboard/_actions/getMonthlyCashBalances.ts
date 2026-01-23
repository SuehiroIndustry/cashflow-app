// app/dashboard/_actions/getMonthlyCashBalances.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { MonthlyBalanceRow } from "../_types";

type Input = {
  cashAccountId: number; // 0 = all
  month: string; // YYYY-MM-01
  rangeMonths: number;
};

function toMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export async function getMonthlyCashBalances(input: Input): Promise<MonthlyBalanceRow[]> {
  const supabase = await createClient();

  const cashAccountId = Number(input.cashAccountId);
  const rangeMonths = Math.max(1, Number(input.rangeMonths || 12));

  const monthStart = new Date(input.month);
  if (Number.isNaN(monthStart.getTime())) {
    throw new Error("month が不正です（YYYY-MM-01）");
  }

  // 期間: monthStart を含めて rangeMonths 分（過去へ）
  // 例: 12 -> monthStart-11months 〜 monthStart+1month(未満)
  const start = addMonths(monthStart, -(rangeMonths - 1));
  const endExclusive = addMonths(monthStart, 1);

  // 対象 cash_flows をまとめて取得
  let q = supabase
    .from("cash_flows")
    .select("date, section, amount")
    .gte("date", start.toISOString().slice(0, 10))
    .lt("date", endExclusive.toISOString().slice(0, 10));

  if (cashAccountId !== 0) {
    q = q.eq("cash_account_id", cashAccountId);
  }

  const { data, error } = await q;
  if (error) throw error;

  // 月別集計
  const map = new Map<string, { income: number; expense: number }>();

  // 先に “空の月” も用意しておく（グラフ・テーブルが揃う）
  for (let i = 0; i < rangeMonths; i++) {
    const d = addMonths(start, i);
    map.set(toMonthKey(d), { income: 0, expense: 0 });
  }

  for (const r of data ?? []) {
    const d = new Date(String((r as any).date));
    const key = toMonthKey(d);
    const section = String((r as any).section);
    const amount = Number((r as any).amount ?? 0);

    const bucket = map.get(key) ?? { income: 0, expense: 0 };

    if (section === "in") bucket.income += amount;
    if (section === "out") bucket.expense += amount;

    map.set(key, bucket);
  }

  // 残高（ここでは「月末残高」を厳密に作るのは DB の初期残高が必要）
  // なので dashboard の表示用に「月ごとの net を積み上げた擬似推移」を作る。
  // 現在残高は Overview / Accounts で出すので OK。
  let running = 0;
  const rows: MonthlyBalanceRow[] = [];

  const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
  for (const k of keys) {
    const v = map.get(k)!;
    const net = v.income - v.expense;
    running += net;

    rows.push({
      month: k,
      income: Math.round(v.income),
      expense: Math.round(v.expense),
      balance: Math.round(running),
    });
  }

  return rows;
}