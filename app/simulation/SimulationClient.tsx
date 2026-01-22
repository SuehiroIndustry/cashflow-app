// app/simulation/SimulationClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getCashShortForecast } from "../dashboard/_actions/getCashShortForecast";

import type {
  CashAccount,
  CashShortForecast,
  CashShortForecastInput,
  CashProjectionMonthRow,
} from "../dashboard/_types";

function toMonthStartISO(yyyymm: string): string {
  // Accept: "YYYY年MM月", "YYYY-MM", "YYYY-MM-01"
  const m1 = yyyymm.match(/^(\d{4})\D+(\d{1,2})/);
  if (m1) {
    const y = m1[1];
    const mm = String(Number(m1[2])).padStart(2, "0");
    return `${y}-${mm}-01`;
  }

  const m2 = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-01`;

  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyymm)) return yyyymm;

  // fallback: current month
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
  const [avgWindowMonths, setAvgWindowMonths] = useState<number>(6);

  // what-if
  const [deltaIncome, setDeltaIncome] = useState<number>(0);
  const [deltaExpense, setDeltaExpense] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ★ ここがポイント：存在しない CashShortForecastPayload は使わない
  const [payload, setPayload] = useState<CashShortForecast | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const loadAccounts = useCallback(async () => {
    setError(null);
    const acc = (await getAccounts()) as CashAccount[];
    setAccounts(acc ?? []);
    if ((acc?.length ?? 0) > 0 && selectedAccountId == null) {
      setSelectedAccountId(acc[0]!.id);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const runForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (selectedAccountId == null) {
        setPayload(null);
        setError("口座を選んでください");
        return;
      }

      const month = toMonthStartISO(monthText);

      const input: CashShortForecastInput = {
        cashAccountId: selectedAccountId,
        month,
        rangeMonths,
        avgWindowMonths,
        whatIf: {
          deltaIncome,
          deltaExpense,
        },
      };

      const res = (await getCashShortForecast(input)) as CashShortForecast;
      setPayload(res);
    } catch (e: any) {
      setPayload(null);
      setError(e?.message ? String(e.message) : "予測の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, monthText, rangeMonths, avgWindowMonths, deltaIncome, deltaExpense]);

  const badge = useMemo(() => {
    if (!payload) return null;
    const base =
      payload.level === "danger"
        ? "border-red-500/60 text-red-200"
        : payload.level === "warn"
        ? "border-yellow-500/60 text-yellow-200"
        : "border-emerald-500/60 text-emerald-200";
    const label = payload.level === "danger" ? "危険" : payload.level === "warn" ? "注意" : "安全";
    return { base, label };
  }, [payload]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <div className="text-sm opacity-80">Account</div>
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

        <div className="space-y-1">
          <div className="text-sm opacity-80">Month</div>
          <input
            className="border rounded px-2 py-1 bg-transparent"
            value={monthText}
            onChange={(e) => setMonthText(e.target.value)}
            placeholder="例: 2026年01月 / 2026-01 / 2026-01-01"
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm opacity-80">rangeMonths</div>
          <input
            className="border rounded px-2 py-1 bg-transparent w-24"
            type="number"
            min={1}
            value={rangeMonths}
            onChange={(e) => setRangeMonths(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm opacity-80">avgWindowMonths</div>
          <input
            className="border rounded px-2 py-1 bg-transparent w-24"
            type="number"
            min={1}
            value={avgWindowMonths}
            onChange={(e) => setAvgWindowMonths(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm opacity-80">ΔIncome（月）</div>
          <input
            className="border rounded px-2 py-1 bg-transparent w-32"
            type="number"
            value={deltaIncome}
            onChange={(e) => setDeltaIncome(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm opacity-80">ΔExpense（月）</div>
          <input
            className="border rounded px-2 py-1 bg-transparent w-32"
            type="number"
            value={deltaExpense}
            onChange={(e) => setDeltaExpense(Number(e.target.value))}
          />
        </div>

        <button
          className="border rounded px-3 py-2"
          onClick={() => void runForecast()}
          disabled={loading}
        >
          {loading ? "Loading..." : "Run"}
        </button>
      </div>

      {error ? <div className="text-sm text-red-200">{error}</div> : null}

      {!payload ? (
        <div className="text-sm opacity-70">No data</div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {badge ? (
              <div className={`border rounded px-3 py-1 text-sm ${badge.base}`}>
                {badge.label}
              </div>
            ) : null}
            <div className="text-sm opacity-80">{payload.message}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="border rounded p-3">
              <div className="text-xs opacity-70">月平均 収入</div>
              <div className="font-semibold">{payload.avgIncome.toLocaleString()}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs opacity-70">月平均 支出</div>
              <div className="font-semibold">{payload.avgExpense.toLocaleString()}</div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs opacity-70">月平均 純増減</div>
              <div className="font-semibold">{payload.avgNet.toLocaleString()}</div>
            </div>
          </div>

          <div className="text-xs opacity-60">
            予測対象: {payload.month} / 直近{payload.avgWindowMonths}ヶ月平均 / 予測{payload.rangeMonths}ヶ月
            {payload.shortDate ? ` / ショート見込み: ${payload.shortDate}` : " / ショート見込み: なし"}
          </div>

          <div className="border rounded p-4">
            <div className="font-semibold mb-2">予測テーブル</div>
            <div className="text-xs opacity-60 mb-2">month / avg income / avg expense / projected balance</div>

            <div className="overflow-auto">
              <table className="min-w-[520px] w-full text-sm">
                <thead className="opacity-80">
                  <tr className="text-left border-b">
                    <th className="py-2">Month</th>
                    <th className="py-2">Income(avg)</th>
                    <th className="py-2">Expense(avg)</th>
                    <th className="py-2">Balance</th>
                  </tr>
                </thead>

                <tbody>
                  {payload.rows.map((r: CashProjectionMonthRow) => (
                    <tr key={r.month} className="border-b last:border-b-0">
                      <td className="py-2">{r.month}</td>
                      <td className="py-2">{r.income.toLocaleString()}</td>
                      <td className="py-2">{r.expense.toLocaleString()}</td>
                      <td className="py-2">{r.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-xs opacity-60 mt-2">
              selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month:{" "}
              {toMonthStartISO(monthText)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}