// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import type { AccountRow } from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  children: React.ReactNode;
};

export default function DashboardClient({
  accounts,
  selectedAccountId,
  children,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const isSingleAccount = accounts.length === 1;
  const singleId = isSingleAccount ? accounts[0].id : null;

  // ✅ 単一口座なら query が無くても URL を正規化（ただし “今のパス” を維持する）
  useEffect(() => {
    if (!singleId) return;

    const q = sp?.get("cashAccountId");
    if (q === String(singleId)) return;

    const next = new URLSearchParams(sp?.toString());
    next.set("cashAccountId", String(singleId));

    // ★ここが本質：/dashboard 固定にせず、pathname を維持する
    router.replace(`${pathname}?${next.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleId, pathname]);

  const selectedName = useMemo(() => {
    const found = accounts.find((a) => a.id === selectedAccountId);
    return found?.name ?? "楽天銀行";
  }, [accounts, selectedAccountId]);

  return (
    <div className="min-h-screen bg-black text-zinc-200">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold tracking-tight">
              Cashflow Dashboard
            </div>

            <nav className="hidden items-center gap-3 md:flex text-sm">
              <Link
                href="/dashboard"
                className="rounded-md px-2 py-1 hover:bg-zinc-900"
              >
                Dashboard
              </Link>
              <Link
                href="/simulation"
                className="rounded-md px-2 py-1 hover:bg-zinc-900"
              >
                Simulation
              </Link>
              <Link
                href="/dashboard/import"
                className="rounded-md px-2 py-1 hover:bg-zinc-900"
              >
                楽天銀行・明細インポート
              </Link>
            </nav>

            <div className="ml-2 hidden text-xs opacity-70 md:block">
              口座: <span className="opacity-90">{selectedName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 既存の Logout ボタン等があるならここ */}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {!isSingleAccount && (
          <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold">口座</div>
            <div className="mt-2 text-sm opacity-70">
              ※ 複数口座対応のための表示（今は楽天銀行1つなら出ません）
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}