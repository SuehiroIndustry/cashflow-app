// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
  overviewPayload: OverviewPayload | null | undefined;
  children?: React.ReactNode;
};

function formatUpdated(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
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
  overviewPayload,
  children,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedAccountId);

  // props が更新されたら追従（key remount でも保険として）
  useEffect(() => {
    setLocalSelectedId(selectedAccountId);
  }, [selectedAccountId]);

  const currentAccountName = useMemo(() => {
    const a = accounts.find((x) => x.id === (localSelectedId ?? -1));
    return a?.name ?? "-";
  }, [accounts, localSelectedId]);

  const onChangeAccount = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const nextId = Number(e.target.value);
      if (!Number.isFinite(nextId)) return;

      setLocalSelectedId(nextId);

      // ✅ URL を唯一の真実にする
      const sp = new URLSearchParams(searchParams?.toString());
      sp.set("cashAccountId", String(nextId));

      router.push(`/dashboard?${sp.toString()}`);
      // ✅ server component 再フェッチを確実に
      router.refresh();
    },
    [router, searchParams]
  );

  const banner = useMemo(() => {
    const bal = cashStatus?.currentBalance ?? 0;
    if (bal <= 0) {
      return {
        title: "残高が危険水域です",
        message: "現在残高が 0 円以下です。支払い予定があるなら、資金ショートが現実的です。",
      };
    }
    return {
      title: "状況を確認中",
      message: "直近の推移を確認してください。",
    };
  }, [cashStatus]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold">Cashflow Dashboard</div>
            <div className="text-xs opacity-70 mt-1">更新: {formatUpdated(cashStatus.updatedAtISO)}</div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/simulation?cashAccountId=${localSelectedId ?? ""}`}
              className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm hover:bg-white/10"
            >
              Simulation
            </Link>

            {/* ✅ 「楽天銀行へ」ボタンは削除。これだけ残す */}
            <Link
              href={`/cash/import/rakuten?cashAccountId=${localSelectedId ?? ""}`}
              className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm hover:bg-white/10"
            >
              楽天銀行・明細インポート
            </Link>
          </div>
        </div>

        {/* Account selector */}
        <div className="mt-6 flex items-center gap-3">
          <div className="text-sm opacity-80">口座:</div>
          <select
            value={localSelectedId ?? ""}
            onChange={onChangeAccount}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-sm text-white"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-black text-white">
                {a.name}
              </option>
            ))}
          </select>

          <div className="text-xs opacity-70">表示中: {currentAccountName}</div>
        </div>

        {/* Banner */}
        <div className="mt-6 rounded-lg border border-white/10 bg-white text-black p-4">
          <div className="font-semibold">{banner.title}</div>
          <div className="text-sm mt-1">{banner.message}</div>
        </div>

        {/* Alert cards (optional) */}
        {!!alertCards?.length && (
          <div className="mt-4 space-y-2">
            {alertCards.map((c, idx) => (
              <div
                key={`${c.title}-${idx}`}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="font-semibold">{c.title}</div>
                <div className="text-sm opacity-80 mt-1">{c.description}</div>
                {c.href && (
                  <div className="mt-3">
                    <Link
                      href={c.href}
                      className="inline-flex rounded-md border border-white/20 bg-black px-3 py-2 text-sm hover:bg-white/10"
                    >
                      {c.actionLabel ?? "開く"}
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* ✅ OverviewCard は payload 必須（あなたの実装に一致） */}
          <OverviewCard payload={overviewPayload} />

          {/* ✅ BalanceCard / EcoCharts は rows 必須（あなたのエラーに一致） */}
          <BalanceCard rows={monthly} />
          <EcoCharts rows={monthly} />
        </div>

        {/* Slot */}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </div>
  );
}