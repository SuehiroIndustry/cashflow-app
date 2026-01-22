// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyCashBalances } from "./_actions/getMonthlyCashBalances";
import { getCashShortForecast } from "./_actions/getCashShortForecast";

import type {
  CashAccount,
  MonthlyCashAccountBalanceRow,
  OverviewPayload,
  CashShortForecast,
} from "./_types";

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

function yen(n: number): string {
  const v = Math.round(Number(n) || 0);
  return new Intl.NumberFormat("ja-JP").format(v);
}

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);

  const [monthlyRows, setMonthlyRows] = useState<MonthlyCashAccountBalanceRow[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const [forecast, setForecast] = useState<CashShortForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const acc = (await getAccounts()) as CashAccount[];
      setAccounts(acc);

      const nextAccountId =
        selectedAccountId ?? (acc?.length ? acc[0].id : null);

      if (nextAccountId != null && selectedAccountId == null) {
        setSelectedAccountId(nextAccountId);
      }

      if (nextAccountId != null) {
        const month = toMonthStartISO(monthText);

        // 月次
        const rows = await getMonthlyCashBalances({
          cashAccountId: nextAccountId,
          month,
          rangeMonths,
        });

        const asc = [...rows].sort((a, b) => a.month.localeCompare(b.month));
        setMonthlyRows(asc);

        // ★ 資金ショート予測（ここが今日の本命）
        const fc = await getCashShortForecast({
          cashAccountId: nextAccountId,
          month,
          rangeMonths,
        });
        setForecast(fc);
      } else {
        setMonthlyRows([]);
        setForecast(null);
      }

      // overview はまだ未実装でOK
      setOverview(null);
    } catch (e: any) {
      setLoadError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [monthText, rangeMonths, selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const forecastBadge = useMemo(() => {
    if (!forecast) return null;
    const base =
      forecast.level === "danger"
        ? "border-red-500/60 text-red-200"
        : forecast.level === "warn"
        ? "border-yellow-500/60 text-yellow-200"
        : "border-emerald-500/60 text-emerald-200";

    const label =
      forecast.level === "danger"
        ? "危険"
        : forecast.level === "warn"
        ? "注意"
        : "安全";

    return { base, label };
  }, [forecast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
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
          <option value={2}>last 2 months</option>
          <option value={6}>last 6 months</option>
          <option value={12}>last 12 months</option>
          <option value={24}>last 24 months</option>
        </select>

        <button
          className="border rounded px-3 py-1 ml-2"
          onClick={() => void load()}
          disabled={loading}
          title="最新を読み込み"
        >
          {loading ? "loading..." : "refresh"}
        </button>
      </div>

      {loadError ? (
        <div className="border border-red-500/50 rounded p-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : null}

      {/* ★ 今日の主役：資金ショート警告カード */}
      {forecast ? (
        <div className="border rounded p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="font-semibold">資金ショート予測</div>
            {forecastBadge ? (
              <span className={`text-xs px-2 py-0.5 rounded border ${forecastBadge.base}`}>
                {forecastBadge.label}
              </span>
            ) : null}
          </div>

          <div className="text-sm opacity-80">{forecast.message}</div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="opacity-60">現在残高</div>
              <div className="font-semibold">¥{yen(forecast.currentBalance)}</div>
            </div>
            <div>
              <div className="opacity-60">月平均 収入</div>
              <div className="font-semibold">¥{yen(forecast.avgIncome)}</div>
            </div>
            <div>
              <div className="opacity-60">月平均 支出</div>
              <div className="font-semibold">¥{yen(forecast.avgExpense)}</div>
            </div>
            <div>
              <div className="opacity-60">月平均 純増減</div>
              <div className="font-semibold">
                {forecast.avgNet >= 0 ? "+" : "-"}¥{yen(Math.abs(forecast.avgNet))}
              </div>
            </div>
          </div>

          <div className="text-xs opacity-60">
            予測対象月: {forecast.month} / 直近: {forecast.rangeMonths}ヶ月 /
            {forecast.predictedMonth
              ? ` ショート見込み: ${forecast.predictedMonth}`
              : " ショート見込み: なし（平均ベース）"}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {selectedAccount && overview ? (
          <OverviewCard accountName={selectedAccount.name} payload={overview} />
        ) : (
          <div className="text-sm opacity-60">Overview not available</div>
        )}

        <BalanceCard rows={monthlyRows} />
      </div>

      <EcoCharts rows={monthlyRows} />

      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month:{" "}
        {toMonthStartISO(monthText)}
      </div>
    </div>
  );
}