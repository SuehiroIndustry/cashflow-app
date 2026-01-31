// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
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

  // select は string で統一
  const [localSelectedId, setLocalSelectedId] = useState<string>(() =>
    selectedAccountId != null ? String(selectedAccountId) : ""
  );

  // props 追従
  useEffect(() => {
    setLocalSelectedId(selectedAccountId != null ? String(selectedAccountId) : "");
  }, [selectedAccountId]);

  const selectedLabel = useMemo(() => {
    const idNum = Number(localSelectedId);
    const a = accounts.find((x) => x.id === idNum);
    return a?.name ?? "-";
  }, [accounts, localSelectedId]);

  function handleAccountChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextIdStr = e.target.value;
    setLocalSelectedId(nextIdStr);

    // ✅ “確実に” サーバー側を再実行させる（これが一番強い）
    // router.refresh の効きが怪しい環境でも必ず切り替わる
    window.location.assign(`/dashboard?cashAccountId=${encodeURIComponent(nextIdStr)}`);
  }

  const selectedAccountIdForLinks =
    localSelectedId && String(localSelectedId).trim() !== "" ? localSelectedId : "";

  return (
    <div className="w-full">
      {/* 上部 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm opacity-80">口座:</div>

          <select
            className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white"
            value={localSelectedId}
            onChange={handleAccountChange}
            disabled={isPending || accounts.length === 0}
          >
            {accounts.map((a) => (
              <option key={String(a.id)} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>

          <div className="text-xs opacity-70">
            表示中: {isPending ? "切替中..." : selectedLabel}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                router.push(
                  selectedAccountIdForLinks
                    ? `/simulation?cashAccountId=${encodeURIComponent(selectedAccountIdForLinks)}`
                    : "/simulation"
                );
              })
            }
            className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            Simulation
          </button>

          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                router.push(
                  selectedAccountIdForLinks
                    ? `/import?cashAccountId=${encodeURIComponent(selectedAccountIdForLinks)}`
                    : "/import"
                );
              })
            }
            className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white hover:bg-white/10"
          >
            楽天銀行・明細インポート
          </button>
        </div>
      </div>

      {/* アラート */}
      {alertCards.length > 0 && (
        <div className="mb-6 space-y-3">
          {alertCards.map((a, i) => (
            <div
              key={`${a.title}-${i}`}
              className="rounded border border-white/10 bg-white p-4 text-black"
            >
              <div className="font-semibold">{a.title}</div>
              {a.description && <div className="mt-1 text-sm">{a.description}</div>}
              {a.href && a.actionLabel && (
                <button
                  type="button"
                  onClick={() => startTransition(() => router.push(a.href!))}
                  className="mt-3 inline-flex rounded bg-black px-3 py-2 text-sm text-white hover:bg-black/80"
                >
                  {a.actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 中身 */}
      <div className="grid gap-4 md:grid-cols-3" key={`grid-${selectedAccountId ?? "none"}`}>
        <OverviewCard payload={overviewPayload} />
        <BalanceCard rows={monthly} />
        <EcoCharts rows={monthly} />
      </div>
    </div>
  );
}