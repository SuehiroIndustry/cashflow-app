"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";
import { getCashShortForecast } from "./_actions/getCashShortForecast";

import type {
  CashAccount,
  MonthlyBalanceRow,
  OverviewPayload,
  CashShortForecast,
} from "./_types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Accepts:
 * - "2026年01月"
 * - "2026-01"
 * - "2026-01-01"
 * - その他 → 今日の年月を採用
 * Returns: "YYYY-MM-01"
 */
function toMonthStartISO(input: string): string {
  const s = (input ?? "").trim();

  // 2026年01月
  const m1 = s.match(/^(\d{4})年(\d{1,2})月$/);
  if (m1) {
    const yyyy = m1[1];
    const mm = pad2(Number(m1[2]));
    return `${yyyy}-${mm}-01`;
  }

  // 2026-01
  const m2 = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m2) {
    const yyyy = m2[1];
    const mm = pad2(Number(m2[2]));
    return `${yyyy}-${mm}-01`;
  }

  // 2026-01-01
  const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m3) return `${m3[1]}-${m3[2]}-01`;

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  return `${yyyy}-${mm}-01`;
}

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);

  const [monthlyRows, setMonthlyRows] = useState<MonthlyBalanceRow[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  // 追加：資金ショート予測
  const [forecast, setForecast] = useState<CashShortForecast | null>(null);

  // 予測の計算窓（直近Nヶ月の平均）
  const [avgWindowMonths, setAvgWindowMonths] = useState<number>(6);

  const [loading, setLoading] = useState<boolean>(false);
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
        selectedAccountId ?? (acc.length > 0 ? acc[0].id : null);

      if (nextAccountId != null && selectedAccountId == null) {
        setSelectedAccountId(nextAccountId);
      }

      if (nextAccountId == null) {
        setMonthlyRows([]);
        setOverview(null);
        setForecast(null);
        return;
      }

      const month = toMonthStartISO(monthText);

      // 月次（直近Nヶ月）
      const rows = (await getMonthlyBalance({
        cashAccountId: nextAccountId,
        month,
        rangeMonths,
      })) as MonthlyBalanceRow[];

      // 表示は昇順（古い→新しい）にしたいならここでsort
      const asc = [...rows].sort((a, b) => a.month.localeCompare(b.month));
      setMonthlyRows(asc);

      // Overview（未実装ならnullでOK）
      setOverview(null);

      // 資金ショート予測（ここが今日の本命）
      const fc = (await getCashShortForecast({
        cashAccountId: nextAccountId,
        month,
        rangeMonths,
        avgWindowMonths,
        // whatIf を今は未使用なら空でもOK（型が要求するなら入れる）
        whatIf: {},
      })) as unknown as CashShortForecast;

      setForecast(fc);
    } catch (e: any) {
      setLoadError(e?.message ?? String(e));
      setMonthlyRows([]);
      setOverview(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [monthText, rangeMonths, avgWindowMonths, selectedAccountId]);

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
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <div className="text-sm opacity-80">Month</div>
          <input
            className="border rounded px-2 py-1 bg-transparent"
            value={monthText}
            onChange={(e) => setMonthText(e.target.value)}
            placeholder="2026年01月"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm opacity-80">Range</div>
          <select
            className="border rounded px-2 py-1 bg-transparent"
            value={rangeMonths}
            onChange={(e) => setRangeMonths(Number(e.target.value))}
          >
            <option value={3}>last 3 months</option>
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
          </select>
        </div>

        <button
          className="border rounded px-3 py-1 hover:bg-white/5"
          onClick={() => void load()}
          disabled={loading}
        >
          refresh
        </button>

        {loading && <div className="text-sm opacity-70">loading...</div>}
        {loadError && <div className="text-sm text-red-300">{loadError}</div>}
      </div>

      {/* Forecast Card */}
      <div className="border rounded p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-semibold">資金ショート予測</div>
          {forecastBadge && (
            <span className={`text-xs border rounded px-2 py-0.5 ${forecastBadge.base}`}>
              {forecastBadge.label}
            </span>
          )}
        </div>

        {!forecast ? (
          <div className="text-sm opacity-70 mt-2">No forecast</div>
        ) : (
          <>
            <div className="text-sm opacity-70 mt-1">{forecast.message}</div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <div className="opacity-70 text-xs">現在残高</div>
                <div className="font-semibold">
                  ¥{forecast.currentBalance.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="opacity-70 text-xs">月平均 収入</div>
                <div className="font-semibold">
                  ¥{forecast.avgIncome.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="opacity-70 text-xs">月平均 支出</div>
                <div className="font-semibold">
                  ¥{forecast.avgExpense.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="opacity-70 text-xs">月平均 純増減</div>
                <div className="font-semibold">
                  ¥{forecast.netChange.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs opacity-60">
              予測対象: {forecast.startMonth} / 直近{forecast.avgWindowMonths}ヶ月平均 / 予測{forecast.rangeMonths}ヶ月
              {forecast.shortDate ? ` / ショート見込み: ${forecast.shortDate}` : " / ショート見込み: なし"}
            </div>
          </>
        )}
      </div>

      {/* Overview */}
      {overview ? (
        <OverviewCard payload={overview} />
      ) : (
        <div className="text-sm opacity-60">Overview not available</div>
      )}

      {/* Monthly Summary */}
      <BalanceCard rows={monthlyRows} />

      {/* Charts */}
      <EcoCharts rows={monthlyRows} />

      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month:{" "}
        {toMonthStartISO(monthText)}
      </div>
    </div>
  );
}