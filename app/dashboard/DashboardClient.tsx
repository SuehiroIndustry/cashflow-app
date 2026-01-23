// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";

import { getAccounts } from "./_actions/getAccounts";
import { getCashShortForecast } from "./_actions/getCashShortForecast";
import { getOverview } from "./_actions/getOverview";

import type {
  CashAccount,
  CashShortForecast,
  CashShortForecastInput,
  OverviewPayload,
} from "./_types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Accepts:
 * - "2026年01月"
 * - "2026-01"
 * - "2026-01-01"
 * -> returns "YYYY-MM-01"
 */
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

  // fallback: current month
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  return `${y}-${m}-01`;
}

function ForecastCard(props: { forecast: CashShortForecast; currentBalance: number }) {
  const { forecast, currentBalance } = props;

  const badge =
    forecast.level === "danger"
      ? { label: "危険", cls: "border-red-500/60 text-red-200" }
      : forecast.level === "warn"
        ? { label: "注意", cls: "border-yellow-500/60 text-yellow-200" }
        : { label: "安全", cls: "border-emerald-500/60 text-emerald-200" };

  return (
    <div className="border rounded p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="font-semibold">資金ショート予測</div>
        <div className={`text-xs border rounded px-2 py-0.5 ${badge.cls}`}>{badge.label}</div>
      </div>

      <div className="text-sm opacity-80 mb-3">{forecast.message}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="opacity-70">現在残高</div>
          <div className="font-semibold">¥{currentBalance.toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-70">月平均 収入</div>
          <div className="font-semibold">¥{forecast.avgIncome.toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-70">月平均 支出</div>
          <div className="font-semibold">¥{forecast.avgExpense.toLocaleString()}</div>
        </div>
        <div>
          <div className="opacity-70">月平均 純増減</div>
          <div className="font-semibold">¥{forecast.avgNet.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3 text-xs opacity-60">
        予測対象: {forecast.month} / 直近{forecast.avgWindowMonths}ヶ月平均 / 予測{forecast.rangeMonths}ヶ月
        {forecast.shortDate ? ` / ショート見込み: ${forecast.shortDate}` : " / ショート見込み: なし"}
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);

  const [forecast, setForecast] = useState<CashShortForecast | null>(null);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const monthISO = useMemo(() => toMonthStartISO(monthText), [monthText]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const acc = await getAccounts();
      setAccounts(acc);

      const nextAccountId =
        selectedAccountId != null
          ? selectedAccountId
          : acc.length > 0
            ? acc[0].id
            : null;

      if (nextAccountId == null) {
        setForecast(null);
        setOverview(null);
        return;
      }

      if (selectedAccountId == null) setSelectedAccountId(nextAccountId);

      const input: CashShortForecastInput = {
        cashAccountId: nextAccountId,
        month: monthISO,
        rangeMonths,
        avgWindowMonths: 6,
      };

      const fc = await getCashShortForecast(input);
      setForecast(fc);

      const ov = await getOverview({ cashAccountId: nextAccountId, month: monthISO });
      setOverview(ov);
    } catch (e: any) {
      setLoadError(e?.message ?? String(e));
      setForecast(null);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [monthISO, rangeMonths, selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Controls（最低限残す） */}
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
          </select>
        </div>

        <button className="border rounded px-3 py-1" onClick={() => void load()} disabled={loading}>
          {loading ? "loading..." : "refresh"}
        </button>

        {loadError && <div className="text-sm text-red-300">{loadError}</div>}
      </div>

      {/* ① Forecast（危険信号） */}
      {forecast ? (
        <ForecastCard forecast={forecast} currentBalance={selectedAccount?.current_balance ?? 0} />
      ) : (
        <div className="text-sm opacity-70">No forecast</div>
      )}

      {/* ② Overview（現在値） */}
      {overview ? (
        <OverviewCard payload={overview} />
      ) : (
        <div className="text-sm opacity-60">Overview not available</div>
      )}
    </div>
  );
}