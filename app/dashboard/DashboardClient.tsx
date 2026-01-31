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

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DashboardClient(props: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    accounts,
    selectedAccountId,
    monthly,
    cashStatus,
    alertCards,
    overviewPayload,
  } = props;

  const selectedLabel = useMemo(() => {
    if (selectedAccountId == null) return "未選択";
    const found = accounts.find((a) => Number(a.id) === Number(selectedAccountId));
    return found?.name ?? `口座ID:${selectedAccountId}`;
  }, [accounts, selectedAccountId]);

  const updatedAtText = useMemo(() => {
    try {
      const d = new Date(cashStatus.updatedAtISO);
      return d.toLocaleString("ja-JP");
    } catch {
      return cashStatus.updatedAtISO;
    }
  }, [cashStatus.updatedAtISO]);

  const onChangeAccount = (v: string) => {
    const id = Number(v);
    if (!Number.isFinite(id)) return;

    startTransition(() => {
      router.replace(`/dashboard?cashAccountId=${id}`);
      router.refresh();
    });
  };

  const idKey = selectedAccountId ?? 0; // key 用（null対策）

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Cashflow Dashboard</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  const id = selectedAccountId ?? accounts[0]?.id ?? 1;
                  router.push(`/simulation?cashAccountId=${id}`);
                })
              }
              className={classNames(
                "rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10",
                isPending && "opacity-60"
              )}
            >
              Simulation
            </button>

            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  const id = selectedAccountId ?? accounts[0]?.id ?? 1;
                  router.push(`/cash/import/rakuten?cashAccountId=${id}`);
                })
              }
              className={classNames(
                "rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10",
                isPending && "opacity-60"
              )}
            >
              楽天銀行・明細インポート
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Cashflow Dashboard</div>
          <div className="text-xs opacity-70">更新: {updatedAtText}</div>
        </div>

        {/* account switch */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="text-sm opacity-80">口座:</div>
          <select
            value={selectedAccountId == null ? "" : String(selectedAccountId)}
            onChange={(e) => onChangeAccount(e.target.value)}
            className="rounded border border-white/20 bg-black px-3 py-2 text-sm text-white"
          >
            {accounts.map((a) => (
              <option key={String(a.id)} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>

          <div className="text-xs opacity-70">
            表示中: {isPending ? "切替中…" : selectedLabel}
          </div>
        </div>

        {/* alerts */}
        {alertCards.length > 0 && (
          <div className="mb-6 space-y-3">
            {alertCards.map((a, i) => (
              <div
                key={`${idKey}-${i}`}
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

        {/* ✅ ここが本丸：口座IDが変わったらカード群を強制remount */}
        <div className="grid gap-4 md:grid-cols-3" key={`grid-${idKey}`}>
          <OverviewCard key={`overview-${idKey}`} payload={overviewPayload} />
          <BalanceCard key={`balance-${idKey}`} rows={monthly} />
          <EcoCharts key={`charts-${idKey}`} rows={monthly} />
        </div>
      </main>
    </div>
  );
}