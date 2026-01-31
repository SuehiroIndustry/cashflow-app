// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard, OverviewPayload } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children?: React.ReactNode;
};

function formatJST(iso: string) {
  // 雑に見やすく（ISO → 表示）
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP");
  } catch {
    return iso;
  }
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
  children,
}: Props) {
  const router = useRouter();

  const onChangeAccount = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      const id = v ? Number(v) : NaN;
      if (!Number.isFinite(id)) return;
      router.push(`/dashboard?cashAccountId=${id}`);
    },
    [router]
  );

  // OverviewCard 用 payload を、君の OverviewCard.tsx の型に合わせて作る
  const overviewPayload: OverviewPayload | null = useMemo(() => {
    const account =
      selectedAccountId != null
        ? accounts.find((a) => a.id === selectedAccountId) ?? null
        : null;

    const latest = monthly.length ? monthly[monthly.length - 1] : null;

    const income = latest?.income ?? 0;
    const expense = latest?.expense ?? 0;

    return {
      cashAccountId: selectedAccountId ?? undefined,
      accountName: account?.name ?? "全口座",
      currentBalance: account?.current_balance ?? 0,
      thisMonthIncome: income,
      thisMonthExpense: expense,
      net: income - expense,
    };
  }, [accounts, selectedAccountId, monthly]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-xl font-semibold">Cashflow Dashboard</div>
          <div className="text-xs opacity-70">
            更新: {formatJST(cashStatus.updatedAtISO)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 右上：楽天CSVアップロード → 文言変更 */}
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-white/20 bg-black text-white hover:bg-white/10"
            onClick={() => router.push("/cash/import/rakuten")}
          >
            楽天銀行・明細インポート
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Account selector (必要なら使う。邪魔なら後で消せる) */}
        <div className="flex items-center gap-3">
          <div className="text-sm opacity-80">口座:</div>
          <select
            value={selectedAccountId ?? ""}
            onChange={onChangeAccount}
            className="bg-black text-white border border-white/20 rounded-md px-2 py-1 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ 上のデカい「楽天銀行の明細CSV」箱は削除：ここには置かない */}

        {/* Alerts */}
        {alertCards.length > 0 && (
          <div className="space-y-2">
            {alertCards.map((a, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/10 bg-white text-black p-4"
              >
                <div className="font-semibold">{a.title}</div>
                <div className="text-sm mt-1">{a.description}</div>
                {a.href && a.actionLabel && (
                  <button
                    type="button"
                    className="mt-3 text-sm underline"
                    onClick={() => router.push(a.href!)}
                  >
                    {a.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard payload={overviewPayload} />
          <BalanceCard rows={monthly} />
          <EcoCharts rows={monthly} />
        </div>

        {children}
      </div>
    </div>
  );
}