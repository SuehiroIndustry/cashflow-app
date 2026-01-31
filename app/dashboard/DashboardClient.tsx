// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
} from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children?: React.ReactNode;
};

// ✅ ここだけ、君の実ルートに合わせて必要なら変えて
const SIMULATION_PATH = "/simulation"; // もし /cash/simulation 等ならここを変更
const RAKUTEN_IMPORT_PATH = "/cash/import/rakuten";

function formatJST(iso: string) {
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

  // ✅ “楽天” を含む口座を探す（なければ null）
  const rakutenAccountId = useMemo(() => {
    const hit = accounts.find((a) => a.name?.includes("楽天"));
    return hit?.id ?? null;
  }, [accounts]);

  const goRakutenAccount = useCallback(() => {
    if (rakutenAccountId == null) {
      // 口座一覧に楽天がいない＝ getAccounts() 側の問題
      alert("口座一覧に「楽天」を含む口座が見つからない。getAccounts() の取得条件を確認しよう。");
      return;
    }
    router.push(`/dashboard?cashAccountId=${rakutenAccountId}`);
  }, [rakutenAccountId, router]);

  // OverviewCard 用 payload（君が貼ってくれた OverviewCard.tsx に合わせる）
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
          <div className="text-xs opacity-70">更新: {formatJST(cashStatus.updatedAtISO)}</div>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ Simulation へ */}
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-white/20 bg-black text-white hover:bg-white/10"
            onClick={() => router.push(SIMULATION_PATH)}
          >
            Simulation
          </button>

          {/* ✅ 楽天銀行の口座へ一発切替 */}
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-white/20 bg-black text-white hover:bg-white/10"
            onClick={goRakutenAccount}
          >
            楽天銀行へ
          </button>

          {/* ✅ 楽天CSVインポート */}
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-white/20 bg-black text-white hover:bg-white/10"
            onClick={() => router.push(RAKUTEN_IMPORT_PATH)}
          >
            楽天銀行・明細インポート
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Account selector */}
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

          {/* 口座が無い時のヒント */}
          {accounts.length === 0 && (
            <div className="text-sm text-red-300">
              口座が0件。getAccounts() の取得条件 or DBを確認。
            </div>
          )}
        </div>

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