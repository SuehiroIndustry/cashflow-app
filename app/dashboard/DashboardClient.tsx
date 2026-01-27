"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null; // 0=全口座, それ以外=口座ID
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtJPY(n: number | null | undefined) {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("ja-JP").format(Math.round(n)) + " 円";
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
}: Props) {
  const sp = useSearchParams();
  const currentAccountParam = sp.get("account"); // "0" | "1" | "2" ...

  const tabs = useMemo(() => {
    // 全口座(0) + 口座ID=1(現金),2(楽天銀行) を前提にしてるなら固定でもOK
    // ただし将来増えるなら accounts から生成に変えたほうがいい
    const findByName = (name: string) => accounts.find((a) => a.name === name)?.id ?? null;

    const cashId = findByName("現金") ?? 1;
    const rakutenId = findByName("楽天銀行") ?? 2;

    return [
      { label: "全口座", account: 0 },
      { label: "現金", account: cashId },
      { label: "楽天銀行", account: rakutenId },
    ];
  }, [accounts]);

  const activeAccount = useMemo(() => {
    // URL優先でハイライト（selectedAccountId とズレても見た目が自然）
    const v = currentAccountParam != null ? Number(currentAccountParam) : selectedAccountId;
    return Number.isFinite(v as number) ? (v as number) : 0;
  }, [currentAccountParam, selectedAccountId]);

  const pageBase = "min-h-screen bg-black text-white";
  const shell = "mx-auto w-full max-w-6xl px-4 py-6";

  const card = "rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm";
  const cardHead = "px-5 pt-4 text-sm font-semibold text-white";
  const cardBody = "px-5 pb-5 pt-3 text-sm text-neutral-200";

  const tabBase =
    "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm transition";
  const tabInactive = "border-neutral-800 bg-neutral-950 text-white hover:bg-neutral-900";
  const tabActive = "border-neutral-200 bg-white text-black";

  return (
    <div className={pageBase}>
      <div className={shell}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          </div>

          {/* Simulationへ */}
          <Link
            href="/simulation"
            prefetch
            className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
          >
            Simulationへ
          </Link>
        </div>

        {/* Tabs：Link化（遷移の体感を上げる） */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {tabs.map((t) => (
            <Link
              key={t.label}
              href={`/dashboard?account=${t.account}`}
              prefetch
              scroll={false}
              className={cx(tabBase, activeAccount === t.account ? tabActive : tabInactive)}
            >
              {t.label}
            </Link>
          ))}

          <div className="ml-2 text-xs text-neutral-400">
            選択中：{cashStatus?.selectedAccountName ?? "—"}
          </div>
        </div>

        {/* Alerts */}
        {alertCards?.length > 0 && (
          <div className="mb-4 space-y-2">
            {alertCards.map((a, idx) => {
              const tone =
                a.severity === "critical"
                  ? "border-red-900 bg-red-950/60"
                  : a.severity === "warning"
                  ? "border-yellow-900 bg-yellow-950/40"
                  : "border-neutral-800 bg-neutral-950";

              return (
                <div
                  key={`${a.title}-${idx}`}
                  className={cx("flex items-center justify-between gap-3 rounded-xl border px-4 py-3", tone)}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{a.title}</div>
                    <div className="mt-0.5 text-xs text-neutral-200">{a.description}</div>
                  </div>

                  {/* ✅ actionLabel/href がある時だけボタン表示（＝警告だけにできる） */}
                  {a.actionLabel && a.href ? (
                    <Link
                      href={a.href}
                      prefetch
                      className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
                    >
                      {a.actionLabel}
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className={card}>
            <div className={cardHead}>Overview</div>
            <div className={cardBody}>
              <div className="space-y-2">
                <div>Account: {cashStatus?.selectedAccountName ?? "—"}</div>
                <div>Current Balance: {fmtJPY(cashStatus?.currentBalance ?? null)}</div>
                <div>This Month Income: {fmtJPY(cashStatus?.monthIncome ?? null)}</div>
                <div>This Month Expense: {fmtJPY(cashStatus?.monthExpense ?? null)}</div>
                <div className="text-emerald-400">Net: {fmtJPY(cashStatus?.monthNet ?? null)}</div>
              </div>
            </div>
          </div>

          <div className={card}>
            <div className={cardHead}>残高推移</div>
            <div className="px-5 pb-5 pt-3">
              <div className="max-h-[540px] overflow-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-neutral-800">
                    {monthly.map((r) => (
                      <tr key={r.month} className="text-neutral-200">
                        <td className="py-2 pr-3">{r.month}</td>
                        <td className="py-2 text-right">
                          {new Intl.NumberFormat("ja-JP").format(Number(r.balance))}
                        </td>
                      </tr>
                    ))}
                    {monthly.length === 0 && (
                      <tr>
                        <td className="py-6 text-center text-neutral-500" colSpan={2}>
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className={card}>
              <div className={cardHead}>推移（サマリ）</div>
              <div className={cardBody}>
                {/* ここは既存のコンポーネントに合わせて調整してOK */}
                <div className="text-xs text-neutral-400">
                  最新月: {cashStatus?.monthLabel ?? "—"}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-neutral-400">収入</div>
                    <div className="text-white">{fmtJPY(cashStatus?.monthIncome ?? null)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400">支出</div>
                    <div className="text-white">{fmtJPY(cashStatus?.monthExpense ?? null)}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400">残高</div>
                    <div className="text-white">{fmtJPY(cashStatus?.monthNet ?? null)}</div>
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
                      {monthly.map((m) => (
                        <tr key={m.month} className="text-neutral-200">
                          <td className="px-3 py-2">{m.month}</td>
                          <td className="px-3 py-2 text-right">
                            {new Intl.NumberFormat("ja-JP").format(Number(m.income))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {new Intl.NumberFormat("ja-JP").format(Number(m.expense))}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {new Intl.NumberFormat("ja-JP").format(Number(m.balance))}
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

            {/* 既存に EcoCharts があるならここで使う（props必須なら渡す） */}
            {/* <EcoCharts rows={monthly} /> */}
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}