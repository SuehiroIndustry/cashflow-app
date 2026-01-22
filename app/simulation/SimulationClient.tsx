"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getCashShortForecast } from "../dashboard/_actions/getCashShortForecast";

import type { CashAccount, CashShortForecastPayload } from "../dashboard/_types";

function toMonthStartISO(yyyymm: string): string {
  const m = yyyymm.match(/^(\d{4})\D+(\d{1,2})/);
  if (m) {
    const y = m[1];
    const mm = String(Number(m[2])).padStart(2, "0");
    return `${y}-${mm}-01`;
  }
  const m2 = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyymm)) return yyyymm;

  const d = new Date();
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${mm}-01`;
}

export default function SimulationClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);

  // what-if
  const [deltaIncome, setDeltaIncome] = useState<number>(0);
  const [deltaExpense, setDeltaExpense] = useState<number>(0);

  // avg calc window
  const [avgWindowMonths, setAvgWindowMonths] = useState<number>(6);

  const [payload, setPayload] = useState<CashShortForecastPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const load = useCallback(async () => {
    setError(null);

    const acc = (await getAccounts()) as CashAccount[];
    setAccounts(acc);

    const nextAccountId =
      selectedAccountId ?? (acc?.length ? acc[0].id : null);

    if (nextAccountId != null && selectedAccountId == null) {
      setSelectedAccountId(nextAccountId);
    }

    if (nextAccountId == null) {
      setPayload(null);
      return;
    }

    const month = toMonthStartISO(monthText);

    try {
      const res = await getCashShortForecast({
        cashAccountId: nextAccountId,
        month,
        rangeMonths,
        avgWindowMonths,
        whatIf: {
          deltaIncome,
          deltaExpense,
        },
      });

      setPayload(res);
    } catch (e: any) {
      setPayload(null);
      setError(e?.message ?? "Unknown error");
    }
  }, [
    monthText,
    rangeMonths,
    avgWindowMonths,
    deltaIncome,
    deltaExpense,
    selectedAccountId,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="text-xl font-semibold">Simulation</div>

      <div className="flex flex-wrap items-center gap-3">
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

        <label className="text-sm opacity-80 ml-4">Month</label>
        <input
          className="border rounded px-2 py-1 bg-transparent"
          value={monthText}
          onChange={(e) => setMonthText(e.target.value)}
        />

        <label className="text-sm opacity-80 ml-4">Range</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={rangeMonths}
          onChange={(e) => setRangeMonths(Number(e.target.value))}
        >
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
          <option value={24}>24 months</option>
          <option value={36}>36 months</option>
        </select>

        <label className="text-sm opacity-80 ml-4">Avg window</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={avgWindowMonths}
          onChange={(e) => setAvgWindowMonths(Number(e.target.value))}
        >
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
        </select>

        <button className="border rounded px-3 py-1 ml-2" onClick={() => void load()}>
          refresh
        </button>
      </div>

      <div className="border rounded p-4 space-y-3">
        <div className="font-semibold">What-if（月あたりの差分）</div>

        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm opacity-80">売上（入金） +</label>
          <input
            className="border rounded px-2 py-1 bg-transparent w-40"
            type="number"
            value={deltaIncome}
            onChange={(e) => setDeltaIncome(Number(e.target.value))}
          />

          <label className="text-sm opacity-80 ml-4">固定費（出金） +</label>
          <input
            className="border rounded px-2 py-1 bg-transparent w-40"
            type="number"
            value={deltaExpense}
            onChange={(e) => setDeltaExpense(Number(e.target.value))}
          />

          <button className="border rounded px-3 py-1" onClick={() => void load()}>
            apply
          </button>
        </div>

        <div className="text-xs opacity-60">
          ※ DBの実績平均に「差分」を加算して試算。実績データが薄い月は精度が落ちる（それでも判断には使える）。
        </div>
      </div>

      {error ? (
        <div className="border border-red-500 rounded p-3 text-sm">
          error: {error}
        </div>
      ) : null}

      {payload ? (
        <div className="space-y-4">
          <div className="border rounded p-4">
            <div className="flex items-center gap-3">
              <div className="font-semibold">資金ショート予測</div>
              <span
                className={`text-xs px-2 py-0.5 rounded border ${
                  payload.shortDate ? "border-red-500" : "border-green-500"
                }`}
              >
                {payload.shortDate ? "危険" : "安全"}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="opacity-70">現在残高</div>
                <div className="font-semibold">¥{payload.currentBalance.toLocaleString()}</div>
              </div>
              <div>
                <div className="opacity-70">月平均 収入</div>
                <div className="font-semibold">¥{payload.avgIncome.toLocaleString()}</div>
              </div>
              <div>
                <div className="opacity-70">月平均 支出</div>
                <div className="font-semibold">¥{payload.avgExpense.toLocaleString()}</div>
              </div>
              <div>
                <div className="opacity-70">月平均 純増減</div>
                <div className="font-semibold">¥{payload.netChange.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-2 text-xs opacity-60">
              予測対象: {payload.startMonth} / 直近{payload.avgWindowMonths}ヶ月平均 / 予測{payload.rangeMonths}ヶ月
              {payload.shortDate ? ` / ショート見込み: ${payload.shortDate}` : " / ショート見込み: なし"}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="font-semibold mb-2">予測テーブル</div>
            <div className="text-xs opacity-60 mb-2">
              month / projectedBalance（平均ベース。季節性は次の段階で入れる）
            </div>

            <div className="overflow-auto">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="opacity-70">
                  <tr className="text-left border-b">
                    <th className="py-2">Month</th>
                    <th className="py-2">Income(avg)</th>
                    <th className="py-2">Expense(avg)</th>
                    <th className="py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.rows.map((r) => (
                    <tr key={r.month} className="border-b last:border-b-0">
                      <td className="py-2">{r.month}</td>
                      <td className="py-2">¥{r.income.toLocaleString()}</td>
                      <td className="py-2">¥{r.expense.toLocaleString()}</td>
                      <td className="py-2">¥{r.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-xs opacity-60">
            selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month: {toMonthStartISO(monthText)}
          </div>
        </div>
      ) : (
        <div className="text-sm opacity-60">No data</div>
      )}
    </div>
  );
}