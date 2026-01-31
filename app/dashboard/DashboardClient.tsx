// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo, useTransition } from "react";
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
  overviewPayload: OverviewPayload;
};

export default function DashboardClient(props: Props) {
  const {
    accounts,
    selectedAccountId,
    monthly,
    cashStatus,
    alertCards,
    overviewPayload,
  } = props;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selectedName = useMemo(() => {
    if (!selectedAccountId) return "";
    const a = accounts.find((x) => x.id === selectedAccountId);
    return a?.name ?? "";
  }, [accounts, selectedAccountId]);

  function onChangeAccount(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value);
    if (!Number.isFinite(id)) return;
    if (selectedAccountId === id) return;

    startTransition(() => {
      router.push(`/dashboard?cashAccountId=${id}`);
    });
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Cashflow Dashboard</div>
            <div className="text-xs opacity-70">
              更新: {new Date(cashStatus.updatedAtISO).toLocaleString("ja-JP")}
              {isPending ? "（更新中…）" : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={() =>
                router.push(`/simulation?cashAccountId=${selectedAccountId ?? ""}`)
              }
            >
              Simulation
            </button>

            <button
              type="button"
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
              onClick={() => router.push(`/cash/import/rakuten`)}
            >
              楽天銀行・明細インポート
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          {/* Account selector */}
          <div className="flex items-center gap-3">
            <div className="text-sm opacity-80">口座:</div>

            {/* ✅ value / option を string で統一（表示固定バグ対策） */}
            <select
              className="rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white"
              value={selectedAccountId == null ? "" : String(selectedAccountId)}
              onChange={onChangeAccount}
            >
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>

            <div className="text-xs opacity-60">表示中: {selectedName || "-"}</div>
          </div>

          {/* Alerts */}
          {alertCards.length > 0 && (
            <div className="mt-4 space-y-2">
              {alertCards.map((a, idx) => (
                <div
                  key={`${a.severity}-${idx}`}
                  className="rounded-lg border border-white/10 bg-white text-black p-4"
                >
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm mt-1">{a.description}</div>

                  {a.href && a.actionLabel && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="rounded-md border border-black/10 bg-black px-3 py-2 text-sm text-white hover:bg-black/80"
                        onClick={() => router.push(a.href!)}
                      >
                        {a.actionLabel}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Main grid */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <OverviewCard payload={overviewPayload} />
            <BalanceCard rows={monthly} />
            <EcoCharts rows={monthly} />
          </div>
        </div>
      </div>
    </div>
  );
}