// app/dashboard/DashboardClient.tsx（フル修正版）

"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
};

function findAccountIdByName(accounts: AccountRow[], keywords: string[]) {
  const hit = accounts.find((a) =>
    keywords.some((k) => (a.name ?? "").toLowerCase().includes(k.toLowerCase()))
  );
  return hit?.id ?? null;
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const rows: MonthlyBalanceRow[] = Array.isArray(monthly) ? monthly : [];

  const { cashId, rakutenId } = useMemo(() => {
    const cashId = findAccountIdByName(accounts, ["現金", "cash"]);
    const rakutenId = findAccountIdByName(accounts, ["楽天", "rakuten"]);
    return { cashId, rakutenId };
  }, [accounts]);

  const setAccount = (id: number) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("account", String(id));
    router.push(`/dashboard?${params.toString()}`);
  };

  const isActive = (id: number) => Number(selectedAccountId) === id;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/simulation"
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
            >
              Simulationへ
            </Link>
          </div>
        </div>

        {/* ✅ 口座切替（Dashboardだけ） */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAccount(0)}
            className={[
              "h-9 rounded-md border px-3 text-sm",
              isActive(0)
                ? "border-neutral-200 bg-white text-black"
                : "border-neutral-800 bg-neutral-950 text-white hover:bg-neutral-900",
            ].join(" ")}
          >
            全口座
          </button>

          {cashId != null && (
            <button
              type="button"
              onClick={() => setAccount(cashId)}
              className={[
                "h-9 rounded-md border px-3 text-sm",
                isActive(cashId)
                  ? "border-neutral-200 bg-white text-black"
                  : "border-neutral-800 bg-neutral-950 text-white hover:bg-neutral-900",
              ].join(" ")}
            >
              現金
            </button>
          )}

          {rakutenId != null && (
            <button
              type="button"
              onClick={() => setAccount(rakutenId)}
              className={[
                "h-9 rounded-md border px-3 text-sm",
                isActive(rakutenId)
                  ? "border-neutral-200 bg-white text-black"
                  : "border-neutral-800 bg-neutral-950 text-white hover:bg-neutral-900",
              ].join(" ")}
            >
              楽天銀行
            </button>
          )}

          <div className="ml-2 text-xs text-neutral-400">
            選択中: {selectedAccountId === 0 ? "全口座" : cashStatus?.selectedAccountName ?? "—"}
          </div>
        </div>

        {/* Main */}
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard payload={cashStatus as any} />
          <BalanceCard rows={rows} />
          <EcoCharts rows={rows} />
        </div>

        <div className="mt-8 flex justify-end">
          <Link
            href="/simulation"
            className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
          >
            Simulationへ
          </Link>
        </div>
      </div>
    </div>
  );
}