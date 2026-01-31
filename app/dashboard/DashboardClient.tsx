"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
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

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
  children,
}: Props) {
  const router = useRouter();

  const onLogout = useCallback(async () => {
    try {
      await fetch("/auth/signout", { method: "POST" });
    } catch {
      // 失敗しても詰まらせない
    }
    router.refresh();
    router.push("/login");
  }, [router]);

  /**
   * Overview 用 payload
   * ※ 正確さより「落ちない・判断材料が見える」を優先
   */
  const overviewPayload: OverviewPayload | null = useMemo(() => {
    if (!selectedAccountId) return null;

    const account = accounts.find(a => a.id === selectedAccountId);
    const latestMonth = monthly?.[monthly.length - 1];

    return {
      accountName: account?.name ?? "-",
      currentBalance: account?.balance ?? 0,
      thisMonthIncome: latestMonth?.income ?? 0,
      thisMonthExpense: latestMonth?.expense ?? 0,
      net:
        (latestMonth?.income ?? 0) -
        (latestMonth?.expense ?? 0),
    };
  }, [accounts, selectedAccountId, monthly]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="text-lg font-semibold">Cashflow Dashboard</div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Logout
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ===== 危険信号 ===== */}
        <div className="rounded-lg border border-white/10 bg-white text-black p-4">
          <div className="font-semibold">
            {cashStatus?.headline ?? "状況を確認中"}
          </div>
          <div className="text-sm mt-1">
            {cashStatus?.message ??
              "最新データを取得後、判断に必要な情報のみ表示します。"}
          </div>
        </div>

        {/* ===== データ取り込み ===== */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">データ取り込み</div>

          <ul className="mt-2 text-sm space-y-1">
            <li>
              <Link
                href="/cash/import/rakuten"
                className="text-blue-300 hover:underline"
              >
                ▶ 楽天銀行 明細CSVアップロード
              </Link>
            </li>
            <li className="text-white/60">
              ※ 週1回CSVを手動アップロードする運用
            </li>
          </ul>
        </div>

        {/* ===== Dashboard 本体 ===== */}
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard payload={overviewPayload} />
          <BalanceCard />
          <EcoCharts />
        </div>

        {children}
      </div>
    </div>
  );
}