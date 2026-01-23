// app/simulation/simulation-client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getMonthlyCashBalances } from "@/app/dashboard/_actions/getMonthlyCashBalances";
import { getCashShortForecast } from "@/app/dashboard/_actions/getCashShortForecast";

import type {
  CashAccount,
  MonthlyBalanceRow,
  CashShortForecast,
  CashShortForecastInput,
} from "@/app/dashboard/_types";

type Props = {
  accounts: CashAccount[];
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toMonthStartISO(input: string): string {
  const s = (input ?? "").trim();

  const jp = s.match(/^(\d{4})年(\d{1,2})月$/);
  if (jp) {
    const y = jp[1];
    const m = pad2(Number(jp[2]));
    return `${y}-${m}-01`;
  }

  const ym = s.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) {
    const y = ym[1];
    const m = pad2(Number(ym[2]));
    return `${y}-${m}-01`;
  }

  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return s;

  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  return `${y}-${m}-01`;
}

function toJpMonthLabel(yyyyMm01: string): string {
  const m = (yyyyMm01 ?? "").match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return yyyyMm01;
  return `${m[1]}年${m[2]}月`;
}

function addMonths(yyyyMm01: string, add: number): string {
  const m = (yyyyMm01 ?? "").match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return yyyyMm01;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const total = y * 12 + (mo - 1) + add;
  const ny = Math.floor(total / 12);
  const nmo = (total % 12) + 1;
  return `${ny}-${pad2(nmo)}-01`;
}

function calcSeries(params: {
  startMonth: string; // YYYY-MM-01
  startBalance: number;
  avgIncome: number;
  avgExpense: number;
  rangeMonths: number;
  incomeDelta?: number; // What-if：毎月の収入上乗せ
  expenseDelta?: number; // What-if：毎月の支出上乗せ
}) {
  const {
    startMonth,
    startBalance,
    avgIncome,
    avgExpense,
    rangeMonths,
    incomeDelta = 0,
    expenseDelta = 0,
  } = params;

  const rows: Array<{ month: string; income: number; expense: number; balance: number }> = [];

  let bal = startBalance;

  for (let i = 0; i < rangeMonths; i++) {
    const month = addMonths(startMonth, i);
    const income = avgIncome + incomeDelta;
    const expense = avgExpense + expenseDelta;
    bal = bal + income - expense;

    rows.push({
      month,
      income,
      expense,
      balance: bal,
    });
  }

  return rows;
}

function findShortMonth(series: Array<{ month: string; balance: number }>): string | null {
  for (const r of series) {
    if (r.balance < 0) return r.month;
  }
  return null;
}

export default function SimulationClient({ accounts }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    accounts.length ? accounts[0].id : null
  );

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);
  const [avgWindowMonths, setAvgWindowMonths] = useState<number>(6);

  // What-if
  const [incomeDelta, setIncomeDelta] = useState<number>(0);
  const [expenseDelta, setExpenseDelta] = useState<number>(0);

  const [baseForecast, setBaseForecast] = useState<CashShortForecast | null>(null);
  const [monthRows, setMonthRows] = useState<MonthlyBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const monthISO = useMemo(() => toMonthStartISO(monthText), [monthText]);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const currentBalance = selectedAccount?.current_balance ?? 0;

  const load = useCallback(async () => {
    if (selectedAccountId == null) return;

    setLoading(true);
    setErr(null);

    try {
      const rows = await getMonthlyCashBalances({
        cashAccountId: selectedAccountId,
        month: monthISO,
        rangeMonths,
      });
      const asc = [...rows].sort((a, b) => a.month.localeCompare(b.month));
      setMonthRows(asc);

      const input: CashShortForecastInput = {
        cashAccountId: selectedAccountId,
        month: monthISO,
        rangeMonths,
        avgWindowMonths,
      };

      const fc = await getCashShortForecast(input);
      setBaseForecast(fc);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setBaseForecast(null);
      setMonthRows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, monthISO, rangeMonths, avgWindowMonths]);

  useEffect(() => {
    void load();
  }, [load]);

  const simulated = useMemo(() => {
    if (!baseForecast) return null;

    const series = calcSeries({
      startMonth: baseForecast.month,
      startBalance: currentBalance,
      avgIncome: baseForecast.avgIncome,
      avgExpense: baseForecast.avgExpense,
      rangeMonths: baseForecast.rangeMonths,
      incomeDelta,
      expenseDelta,
    });

    const shortMonth = findShortMonth(series.map((r) => ({ month: r.month, balance: r.balance })));
    const avgNet = (baseForecast.avgIncome + incomeDelta) - (baseForecast.avgExpense + expenseDelta);

    return {
      series,
      shortMonth,
      avgIncome: baseForecast.avgIncome + incomeDelta,
      avgExpense: baseForecast.avgExpense + expenseDelta,
      avgNet,
    };
  }, [baseForecast, currentBalance, incomeDelta, expenseDelta]);

  const baseShortLabel = baseForecast?.shortDate
    ? `ショート: ${toJpMonthLabel(baseForecast.shortDate)}`
    : "ショートなし";

  const simShortLabel = simulated?.shortMonth
    ? `ショート: ${toJpMonthLabel(simulated.shortMonth)}`
    : "ショートなし";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Account</label>
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Month</label>
          <input
            className="border rounded px-2 py-1 bg-transparent"
            value={monthText}
            onChange={(e) => setMonthText(e.target.value)}
            placeholder="2026年01月"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Range</label>
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={rangeMonths}
            onChange={(e) => setRangeMonths(Number(e.target.value))}
          >
            <option value={3}>last 3 months</option>
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
            <option value={24}>last 24 months</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80">Avg</label>
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={avgWindowMonths}
            onChange={(e) => setAvgWindowMonths(Number(e.target.value))}
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>

        <button className="border rounded px-3 py-1" onClick={() => void load()} disabled={loading}>
          {loading ? "loading..." : "refresh"}
        </button>

        {err && <div className="text-sm text-red-300">{err}</div>}
      </div>

      {/* What-if */}
      <div className="border rounded p-4 space-y-3">
        <div className="font-semibold">What-if（毎月の上乗せ）</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <label className="w-32 opacity-80">収入 +（円/月）</label>
            <input
              className="border rounded px-2 py-1 bg-transparent w-48"
              inputMode="numeric"
              value={incomeDelta}
              onChange={(e) => setIncomeDelta(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-32 opacity-80">支出 +（円/月）</label>
            <input
              className="border rounded px-2 py-1 bg-transparent w-48"
              inputMode="numeric"
              value={expenseDelta}
              onChange={(e) => setExpenseDelta(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="text-xs opacity-60">
          ※ “固定費が月◯万増える/減る” みたいな検討用。単発イベント（ボーナス/設備投資）は次の段で足す。
        </div>
      </div>

      {/* Compare */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-2">結果（ベース vs What-if）</div>

        {!baseForecast || !simulated ? (
          <div className="text-sm opacity-70">No forecast</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="border rounded p-3">
              <div className="font-semibold mb-2">ベース</div>
              <div>現在残高: ¥{currentBalance.toLocaleString()}</div>
              <div>月平均 収入: ¥{baseForecast.avgIncome.toLocaleString()}</div>
              <div>月平均 支出: ¥{baseForecast.avgExpense.toLocaleString()}</div>
              <div className="font-semibold">月平均 純増減: ¥{baseForecast.avgNet.toLocaleString()}</div>
              <div className="mt-2">{baseShortLabel}</div>
            </div>

            <div className="border rounded p-3">
              <div className="font-semibold mb-2">What-if</div>
              <div>現在残高: ¥{currentBalance.toLocaleString()}</div>
              <div>月平均 収入: ¥{simulated.avgIncome.toLocaleString()}</div>
              <div>月平均 支出: ¥{simulated.avgExpense.toLocaleString()}</div>
              <div className="font-semibold">月平均 純増減: ¥{simulated.avgNet.toLocaleString()}</div>
              <div className="mt-2">{simShortLabel}</div>
            </div>
          </div>
        )}
      </div>

      {/* Projection table */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-3">予測テーブル（What-if）</div>

        {!simulated ? (
          <div className="text-sm opacity-70">No data</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="opacity-70">
                <tr className="text-left border-b">
                  <th className="py-2">Month</th>
                  <th className="py-2">Income</th>
                  <th className="py-2">Expense</th>
                  <th className="py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {simulated.series.map((r) => (
                  <tr key={r.month} className="border-b last:border-b-0">
                    <td className="py-2">{toJpMonthLabel(r.month)}</td>
                    <td className="py-2">¥{r.income.toLocaleString()}</td>
                    <td className="py-2">¥{r.expense.toLocaleString()}</td>
                    <td className="py-2">¥{r.balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-xs opacity-60 mt-3">
          account: {selectedAccount ? selectedAccount.name : "none"} / start: {toJpMonthLabel(monthISO)}
        </div>
      </div>

      {/* Context rows (actual month rows) */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-3">実績（月次）</div>

        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="opacity-70">
              <tr className="text-left border-b">
                <th className="py-2">Month</th>
                <th className="py-2">Income</th>
                <th className="py-2">Expense</th>
                <th className="py-2">Balance</th>
              </tr>
            </thead>
            <tbody>
              {monthRows.map((r: MonthlyBalanceRow) => (
                <tr key={r.month} className="border-b last:border-b-0">
                  <td className="py-2">{r.month}</td>
                  <td className="py-2">¥{r.income.toLocaleString()}</td>
                  <td className="py-2">¥{r.expense.toLocaleString()}</td>
                  <td className="py-2">¥{r.balance.toLocaleString()}</td>
                </tr>
              ))}
              {!monthRows.length && (
                <tr>
                  <td className="py-2 opacity-60" colSpan={4}>
                    No rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs opacity-60 mt-3">
          ※ この実績を元に getCashShortForecast が平均（avg）を作ってる。
        </div>
      </div>
    </div>
  );
}