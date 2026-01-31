// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useMemo, useTransition } from "react";
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
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
  overviewPayload: OverviewPayload | null | undefined;
};

function fmtYen(v: number | null | undefined): string {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 0;
  return n.toLocaleString("ja-JP") + " 円";
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
  overviewPayload,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const onChangeAccount = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = Number(e.target.value);

      startTransition(() => {
        router.push(`/dashboard?cashAccountId=${nextId}`);
        // ✅ これが無いと「URLだけ変わって中身が古い」事故が起きやすい
        router.refresh();
      });
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Cashflow Dashboard</h1>
            <div className="text-xs text-white/60 mt-1">
              更新:{" "}
              {cashStatus?.updatedAtISO
                ? new Date(cashStatus.updatedAtISO).toLocaleString("ja-JP")
                : "-"}
              {isPending ? "（更新中…）" : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-white/20 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm"
              onClick={() => router.push(`/simulation?cashAccountId=${selectedAccountId ?? ""}`)}
            >
              Simulation
            </button>

            <button
              type="button"
              className="rounded-md border border-white/20 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm"
              onClick={() => router.push(`/cash/import/rakuten`)}
            >
              楽天銀行・明細インポート
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center gap-3">
          <div className="text-sm text-white/70">口座:</div>
          <select
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm text-white"
            value={selectedAccountId ?? ""}
            onChange={onChangeAccount}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <div className="text-sm text-white/50">
            表示中: {selected?.name ?? "-"}
          </div>
        </div>

        {/* Top Alert (single strong banner) */}
        {alertCards?.length ? (
          <div className="mt-6 rounded-lg bg-white text-black p-4">
            <div className="font-semibold">{alertCards[0].title}</div>
            <div className="text-sm mt-1">{alertCards[0].description}</div>

            {alertCards[0].href && alertCards[0].actionLabel ? (
              <div className="mt-3">
                <button
                  type="button"
                  className="rounded-md border border-black/20 bg-black text-white hover:bg-black/80 px-3 py-2 text-sm"
                  onClick={() => router.push(alertCards[0].href!)}
                >
                  {alertCards[0].actionLabel}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Content */}
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <OverviewCard payload={overviewPayload} />

          {/* BalanceCard / EcoCharts は rows 必須 */}
          <BalanceCard rows={monthly} />
          <EcoCharts rows={monthly} />
        </div>

        {/* Debug info (optional) */}
        <div className="mt-6 text-xs text-white/40">
          selectedAccountId: {selectedAccountId ?? "null"} / current_balance:{" "}
          {fmtYen(selected?.current_balance)}
        </div>
      </div>
    </div>
  );
}