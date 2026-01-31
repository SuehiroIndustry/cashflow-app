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

// ✅ 必要なら君の実ルートに合わせて変更
const SIMULATION_PATH = "/simulation";
const RAKUTEN_IMPORT_PATH = "/cash/import/rakuten";

function formatJST(iso: string) {
  try {
    return new Date(iso).toLocaleString("ja-JP");
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

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const selectedIdMissing = useMemo(() => {
    return selectedAccountId != null && !selectedAccount;
  }, [selectedAccountId, selectedAccount]);

  const onChangeAccount = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      const id = v ? Number(v) : NaN;
      if (!Number.isFinite(id)) return;
      router.push(`/dashboard?cashAccountId=${id}`);
    },
    [router]
  );

  // OverviewCard 用 payload（君の OverviewCard.tsx に合わせる）
  const overviewPayload: OverviewPayload | null = useMemo(() => {
    const latest = monthly.length ? monthly[monthly.length - 1] : null;
    const income = latest?.income ?? 0;
    const expense = latest?.expense ?? 0;

    return {
      cashAccountId: selectedAccountId ?? undefined,
      accountName: selectedAccount?.name ?? (selectedAccountId != null ? `不明(ID=${selectedAccountId})` : "全口座"),
      currentBalance: selectedAccount?.current_balance ?? 0,
      thisMonthIncome: income,
      thisMonthExpense: expense,
      net: income - expense,
    };
  }, [monthly, selectedAccount, selectedAccountId]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <div className="text-xl font-semibold">Cashflow Dashboard</div>
          <div className="text-xs opacity-70">更新: {formatJST(cashStatus.updatedAtISO)}</div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-3 py-2 rounded-md border border-white/20 bg-black text-white hover:bg-white/10"
            onClick={() => router.push(SIMULATION_PATH)}
          >
            Simulation
          </button>

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
            {/* ✅ URLで指定されたIDが accounts に無い場合、先頭に “不明ID” を出して原因を可視化 */}
            {selectedIdMissing && selectedAccountId != null && (
              <option value={selectedAccountId}>
                {`不明な口座 (ID=${selectedAccountId})`}
              </option>
            )}

            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {accounts.length === 0 && (
            <div className="text-sm text-red-300">
              口座が0件。getAccounts() / RLS / データを確認。
            </div>
          )}
        </div>

        {/* ✅ ここが今回の本質。URL指定IDが見つからないなら “取得が落ちてる” */}
        {selectedIdMissing && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <div className="font-semibold text-red-200">
              指定した口座IDが「口座一覧」に存在しません
            </div>
            <div className="mt-1 opacity-90">
              URLの cashAccountId={selectedAccountId} は来ていますが、accounts にそのIDが無いので表示できません。
              これはUIではなく、口座取得（getAccounts）かRLS、またはDBに楽天口座が無いのが原因です。
            </div>
          </div>
        )}

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