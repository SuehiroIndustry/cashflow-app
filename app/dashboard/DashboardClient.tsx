// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null; // 0 = 全口座
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
};

function formatJPY(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ja-JP").format(Math.round(n)) + " 円";
}

function findByName(accounts: AccountRow[], keyword: string) {
  const k = keyword.trim();
  return accounts.find((a) => String(a.name ?? "").includes(k)) ?? null;
}

function severityStyle(sev: AlertCard["severity"]) {
  if (sev === "critical") {
    return "border-red-900/60 bg-red-950/40 text-red-100";
  }
  if (sev === "warning") {
    return "border-yellow-900/60 bg-yellow-950/40 text-yellow-100";
  }
  return "border-neutral-800 bg-neutral-950 text-neutral-100";
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
}: Props) {
  const cash = useMemo(() => findByName(accounts, "現金"), [accounts]);
  const rakuten = useMemo(() => findByName(accounts, "楽天"), [accounts]);

  const tabAll = { id: 0, label: "全口座" };
  const tabCash = cash ? { id: cash.id, label: "現金" } : null;
  const tabRakuten = rakuten ? { id: rakuten.id, label: "楽天銀行" } : null;

  const activeId = selectedAccountId ?? null;

  const pageBase = "min-h-screen bg-black text-white";
  const shell = "mx-auto w-full max-w-6xl px-4 py-6";

  const card = "rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm";
  const cardHead = "px-5 pt-4 text-sm font-semibold text-white";
  const cardBody = "px-5 pb-5 pt-3 text-sm text-neutral-200";

  const tabsWrap = "inline-flex rounded-lg border border-neutral-800 bg-neutral-950 p-1";
  const tabBase =
    "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm transition-colors";
  const tabActive = "bg-white text-black";
  const tabIdle = "text-white hover:bg-neutral-900";

  const latestLabel = cashStatus?.monthLabel ?? "—";

  return (
    <div className={pageBase}>
      <div className={shell}>
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>

            {/* Tabs */}
            <div className="mt-3 flex items-center gap-3">
              <div className={tabsWrap}>
                <Link
                  href={`/dashboard?account=${tabAll.id}`}
                  prefetch
                  className={`${tabBase} ${activeId === tabAll.id ? tabActive : tabIdle}`}
                >
                  {tabAll.label}
                </Link>

                {tabCash && (
                  <Link
                    href={`/dashboard?account=${tabCash.id}`}
                    prefetch
                    className={`${tabBase} ${activeId === tabCash.id ? tabActive : tabIdle}`}
                  >
                    {tabCash.label}
                  </Link>
                )}

                {tabRakuten && (
                  <Link
                    href={`/dashboard?account=${tabRakuten.id}`}
                    prefetch
                    className={`${tabBase} ${activeId === tabRakuten.id ? tabActive : tabIdle}`}
                  >
                    {tabRakuten.label}
                  </Link>
                )}
              </div>

              <div className="text-sm text-neutral-400">
                選択中:{" "}
                <span className="text-neutral-200">
                  {cashStatus?.selectedAccountName ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Simulation（全口座固定） */}
          <Link
            href="/simulation"
            prefetch
            className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
          >
            Simulationへ
          </Link>
        </div>

        {/* Alerts */}
        {alertCards.length > 0 && (
          <div className="mb-4 space-y-2">
            {alertCards.map((a, idx) => (
              <div
                key={idx}
                className={`rounded-xl border px-4 py-3 ${severityStyle(a.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="mt-1 text-sm opacity-90">{a.description}</div>
                  </div>

                  {/* 要望：危険アラートでシミュレーションに飛ばさない。
                      それ以外で href があるものだけボタン表示 */}
                  {a.href && a.actionLabel && (
                    <Link
                      href={a.href}
                      prefetch
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
                    >
                      {a.actionLabel}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Overview */}
          <div className={card}>
            <div className={cardHead}>Overview</div>
            <div className={cardBody}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Account</span>
                  <span className="text-sm font-semibold text-white">
                    {cashStatus?.selectedAccountName ?? "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Current Balance</span>
                  <span className="text-sm font-semibold text-white">
                    {formatJPY(cashStatus?.currentBalance)}
                  </span>
                </div>
                <div className="pt-2 text-xs text-neutral-500">最新月: {latestLabel}</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">This Month Income</span>
                  <span className="text-sm font-semibold text-white">
                    {formatJPY(cashStatus?.monthIncome)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">This Month Expense</span>
                  <span className="text-sm font-semibold text-white">
                    {formatJPY(cashStatus?.monthExpense)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Net</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {formatJPY(cashStatus?.monthNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance history */}
          <div className={card}>
            <div className={cardHead}>残高推移</div>
            <div className={cardBody}>
              {monthly.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">データがありません</div>
              ) : (
                <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
                  {monthly.slice(0, 24).map((r) => (
                    <div
                      key={r.month}
                      className="flex items-center justify-between border-b border-neutral-800 pb-2"
                    >
                      <span className="text-xs text-neutral-300">{r.month}</span>
                      <span className="text-sm font-semibold text-white">
                        {new Intl.NumberFormat("ja-JP").format(Math.round(Number(r.balance ?? 0)))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Summary + Table */}
          <div className="grid gap-4">
            <div className={card}>
              <div className={cardHead}>推移（サマリ）</div>
              <div className={cardBody}>
                <div className="text-xs text-neutral-400">最新月: {latestLabel}</div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-neutral-400">収入</div>
                    <div className="font-semibold text-white">{formatJPY(cashStatus?.monthIncome)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400">支出</div>
                    <div className="font-semibold text-white">{formatJPY(cashStatus?.monthExpense)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-neutral-400">残高</div>
                    <div className="font-semibold text-white">{formatJPY(cashStatus?.monthNet)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className={cardHead}>月次（一覧）</div>
              <div className="px-5 pb-5 pt-3">
                <div className="overflow-hidden rounded-lg border border-neutral-800">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-950">
                      <tr className="text-left text-xs text-neutral-400">
                        <th className="px-3 py-2">month</th>
                        <th className="px-3 py-2 text-right">income</th>
                        <th className="px-3 py-2 text-right">expense</th>
                        <th className="px-3 py-2 text-right">balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                      {monthly.slice(0, 24).map((r) => (
                        <tr key={r.month} className="text-neutral-200">
                          <td className="px-3 py-2">{r.month}</td>
                          <td className="px-3 py-2 text-right">
                            {new Intl.NumberFormat("ja-JP").format(Math.round(Number(r.income ?? 0)))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {new Intl.NumberFormat("ja-JP").format(Math.round(Number(r.expense ?? 0)))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {new Intl.NumberFormat("ja-JP").format(Math.round(Number(r.balance ?? 0)))}
                          </td>
                        </tr>
                      ))}

                      {monthly.length === 0 && (
                        <tr>
                          <td className="px-3 py-6 text-center text-neutral-500" colSpan={4}>
                            データがありません
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}