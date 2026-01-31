// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
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
  overviewPayload: OverviewPayload;
};

export default function DashboardClient(props: Props) {
  const { accounts, selectedAccountId, monthly, cashStatus, alertCards, overviewPayload } = props;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ✅ 内部選択状態（即時UI反映用）
  //    propsが変わったら追従させる（ここがないと「URL変わったのに画面が固まる」系が起きる）
  const [localSelectedId, setLocalSelectedId] = useState<string>(() => {
    return selectedAccountId != null ? String(selectedAccountId) : "";
  });

  useEffect(() => {
    setLocalSelectedId(selectedAccountId != null ? String(selectedAccountId) : "");
  }, [selectedAccountId]);

  // 表示名（「表示中: 〜」）
  const selectedLabel = useMemo(() => {
    const idNum = Number(localSelectedId);
    const a = accounts.find((x) => x.id === idNum);
    return a?.name ?? "-";
  }, [accounts, localSelectedId]);

  function handleAccountChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextIdStr = e.target.value; // ✅ 次のID（これが正）
    setLocalSelectedId(nextIdStr);     // ✅ まずUIを即時更新

    startTransition(() => {
      router.push(`/dashboard?cashAccountId=${encodeURIComponent(nextIdStr)}`);
      // router.refresh(); は基本不要。もし環境依存で固まるなら最後の手段で足す。
    });
  }

  return (
    <div className="w-full">
      {/* 口座セレクタ */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-sm opacity-80">口座:</div>

        <select
          className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white"
          value={localSelectedId}              // ✅ controlled（必ずstring）
          onChange={handleAccountChange}       // ✅ nextIdでpush
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

      {/* アラート */}
      {alertCards.length > 0 && (
        <div className="mb-6 space-y-3">
          {alertCards.map((a, i) => (
            <div
              key={`${a.title}-${i}`}
              className="rounded border border-white/10 bg-white text-black p-4"
            >
              <div className="font-semibold">{a.title}</div>
              {a.description && <div className="text-sm mt-1">{a.description}</div>}
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

      {/* 本体（既存の構成を維持） */}
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={overviewPayload} />
        <BalanceCard rows={monthly} />
        <EcoCharts rows={monthly} />
      </div>
    </div>
  );
}