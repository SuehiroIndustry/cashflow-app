// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  OverviewPayload,
  CashStatus,
  AlertCard,
} from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null; // server が計算した現在の口座
  monthly: MonthlyBalanceRow[];
  overviewPayload: OverviewPayload | null;
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children?: React.ReactNode;
};

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickTopAlert(alerts: AlertCard[]): AlertCard | null {
  if (!alerts?.length) return null;
  const priority = { critical: 0, warning: 1, info: 2 } as const;
  return [...alerts].sort((a, b) => priority[a.severity] - priority[b.severity])[0];
}

export default function DashboardClient(props: Props) {
  const {
    accounts,
    selectedAccountId,
    monthly,
    overviewPayload,
    cashStatus,
    alertCards,
    children,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // ✅ URL を正とする（ここが肝）
  const urlAccountId = useMemo(() => toInt(sp.get("cashAccountId")), [sp]);
  const effectiveAccountId = useMemo(() => {
    // URLが不正なら server の selectedAccountId を使う
    if (urlAccountId != null && accounts.some((a) => a.id === urlAccountId)) return urlAccountId;
    if (selectedAccountId != null && accounts.some((a) => a.id === selectedAccountId))
      return selectedAccountId;
    return accounts[0]?.id ?? null;
  }, [urlAccountId, selectedAccountId, accounts]);

  const effectiveAccountName = useMemo(() => {
    const a = accounts.find((x) => x.id === effectiveAccountId);
    return a?.name ?? "-";
  }, [accounts, effectiveAccountId]);

  const onChangeAccount = useCallback(
    (nextId: number) => {
      const next = new URLSearchParams(sp.toString());
      next.set("cashAccountId", String(nextId));

      // ✅ push だけだと再取得が噛み合わないことがあるので refresh を噛ます
      router.push(`${pathname}?${next.toString()}`);
      router.refresh();
    },
    [router, pathname, sp]
  );

  const topAlert = useMemo(() => pickTopAlert(alertCards), [alertCards]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>
            <div className="text-xs opacity-70">
              更新: {new Date(cashStatus.updatedAtISO).toLocaleString("ja-JP")}
            </div>
          </div>

          {/* ✅ 右上ボタン（「楽天銀行へ」は消す） */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/simulation")}
              className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            >
              Simulation
            </button>

            <button
              type="button"
              onClick={() => router.push("/cash/import/rakuten")}
              className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            >
              楽天銀行・明細インポート
            </button>
          </div>
        </div>

        {/* Account selector */}
        <div className="flex items-center gap-3">
          <div className="text-sm opacity-80">口座:</div>
          <select
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm text-white"
            value={effectiveAccountId ?? ""}
            onChange={(e) => onChangeAccount(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          <div className="text-xs opacity-60">表示中: {effectiveAccountName}</div>
        </div>

        {/* Alert banner */}
        {topAlert && (
          <div className="rounded-lg border border-white/10 bg-white text-black p-4">
            <div className="font-semibold">{topAlert.title}</div>
            <div className="text-sm mt-1">{topAlert.description}</div>
            {topAlert.href && topAlert.actionLabel && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => router.push(topAlert.href!)}
                  className="rounded-md border border-black/20 px-3 py-2 text-sm hover:bg-black/5"
                >
                  {topAlert.actionLabel}
                </button>
              </div>
            )}
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