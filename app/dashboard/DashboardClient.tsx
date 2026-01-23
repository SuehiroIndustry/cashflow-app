// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyCashBalances } from "./_actions/getMonthlyCashBalances";
import { getCashShortForecast } from "./_actions/getCashShortForecast";
import { getOverview } from "./_actions/getOverview";

import type {
  CashAccount,
  MonthlyBalanceRow,
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

// "YYYY-MM-01" -> "YYYY年MM月"
function toJpMonthLabel(yyyyMm01: string): string {
  const m = (yyyyMm01 ?? "").match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!m) return yyyyMm01;
  return `${m[1]}年${m[2]}月`;
}

// month差（from -> to）。同月なら0。toが過去ならマイナス。
function diffMonths(fromYYYYMM01: string, toYYYYMM01: string): number {
  const fm = (fromYYYYMM01 ?? "").match(/^(\d{4})-(\d{2})-\d{2}$/);
  const tm = (toYYYYMM01 ?? "").match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (!fm || !tm) return 0;

  const fy = Number(fm[1]);
  const fmo = Number(fm[2]);
  const ty = Number(tm[1]);
  const tmo = Number(tm[2]);

  return (ty - fy) * 12 + (tmo - fmo);
}

function ForecastCard(props: { forecast: CashShortForecast; currentBalance: number }) {
  const { forecast, currentBalance } = props;

  const badge =
    forecast.level === "danger"
      ? { label: "危険", cls: "border-red-500/60 text-red-200" }
      : forecast.level === "warn"
        ? { label: "注意", cls: "border-yellow-500/60 text-yellow-200" }
        : { label: "安全", cls: "border-emerald-500/60 text-emerald-200" };

  const monthsToShort = forecast.shortDate
    ? diffMonths(forecast.month, forecast.shortDate)
    : null;

  const headline = forecast.shortDate
    ? `ショートまで：あと ${Math.max(0, monthsToShort ?? 0)} ヶ月（${toJpMonthLabel(
        forecast.shortDate
      )}）`
    : `予測期間内はショートなし（${forecast.rangeMonths}ヶ月）`;

  const avgNetNote =
    forecast.avgNet < 0
      ? `毎月 ¥${Math.abs(forecast.avgNet).toLocaleString()} ずつ減っています`
      : forecast.avgNet > 0
        ? `毎月 ¥${forecast.avgNet.toLocaleString()} ずつ増えています`
        : `増減なし（±0）`;

  return (
    <div className="border rounded p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="font-semibold">資金ショート予測</div>
        <div className={`text-xs border rounded px-2 py-0.5 ${badge.cls}`}>{badge.label}</div>
      </div>

      {/* ★ここが主役：期限が一発で分かる */}
      <div className="text-sm font-semibold mb-1">{headline}</div>
      <div className="text-xs opacity-70 mb-3">{avgNetNote}</div>

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
        予測対象: {toJpMonthLabel(forecast.month)} / 直近{forecast.avgWindowMonths}ヶ月平均 / 予測
        {forecast.rangeMonths}ヶ月
        {forecast.shortDate
          ? ` / ショート見込み: ${toJpMonthLabel(forecast.shortDate)}`
          : " / ショート見込み: なし"}
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);

  const [monthRows, setMonthRows] = useState<MonthlyBalanceRow[]>([]);
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
        setMonthRows([]);
        setForecast(null);
        setOverview(null);
        return;
      }

      if (selectedAccountId == null) {
        setSelectedAccountId(nextAccountId);
      }

      const rows = await getMonthlyCashBalances({
        cashAccountId: nextAccountId,
        month: monthISO,
        rangeMonths,
      });

      const asc = [...rows].sort((a, b) => a.month.localeCompare(b.month));
      setMonthRows(asc);

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
    } finally {
      setLoading(false);
    }
  }, [monthISO, rangeMonths, selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthSummary = useMemo(() => {
    if (!monthRows.length) return null;
    const last = monthRows[monthRows.length - 1];
    return {
      income: last.income,
      expense: last.expense,
      balance: last.balance,
    };
  }, [monthRows]);

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
          </select>
        </div>

        <button className="border rounded px-3 py-1" onClick={() => void load()} disabled={loading}>
          {loading ? "loading..." : "refresh"}
        </button>

        {loadError && <div className="text-sm text-red-300">{loadError}</div>}
      </div>

      {/* Forecast card */}
      {forecast ? (
        <ForecastCard forecast={forecast} currentBalance={selectedAccount?.current_balance ?? 0} />
      ) : (
        <div className="text-sm opacity-70">No forecast</div>
      )}

      {/* Overview */}
      {overview ? (
        <OverviewCard payload={overview} />
      ) : (
        <div className="text-sm opacity-60">Overview not available</div>
      )}

      {/* Month summary */}
      <div className="border rounded p-4">
        <div className="font-semibold mb-2">月次サマリ</div>
        {monthSummary ? (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="opacity-70">Income</div>
              <div className="font-semibold">¥{monthSummary.income.toLocaleString()}</div>
            </div>
            <div>
              <div className="opacity-70">Expense</div>
              <div className="font-semibold">¥{monthSummary.expense.toLocaleString()}</div>
            </div>
            <div>
              <div className="opacity-70">Balance</div>
              <div className="font-semibold">¥{monthSummary.balance.toLocaleString()}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-60">No data</div>
        )}
      </div>

      {/* Charts + table */}
      <EcoCharts rows={monthRows} />

      <div className="border rounded p-4">
        <div className="font-semibold mb-3">last {Math.min(rangeMonths, monthRows.length)} months</div>

        <div className="overflow-auto">
          <table className="min-w-[720px] w-full text-sm">
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
          selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month: {monthISO}
        </div>
      </div>
    </div>
  );
}