// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

function norm(s: string) {
  return (s ?? "").replace(/\s+/g, "").toLowerCase();
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
}: Props) {
  const router = useRouter();

  // ✅ “現金っぽい” “楽天っぽい” をゆるく拾う（名前揺れ耐性）
  const cashAccount = useMemo(() => {
    return accounts.find((a) => norm(a.name).includes("現金") || norm(a.name).includes("cash"));
  }, [accounts]);

  const rakutenAccount = useMemo(() => {
    return accounts.find((a) => norm(a.name).includes("楽天") || norm(a.name).includes("rakuten"));
  }, [accounts]);

  // ✅ Dashboardは「全口座 / 現金 / 楽天銀行」だけ欲しい
  const accountTabs = useMemo(() => {
    const tabs: Array<{ id: number; label: string }> = [{ id: 0, label: "全口座" }];
    if (cashAccount) tabs.push({ id: Number(cashAccount.id), label: "現金" });
    if (rakutenAccount) tabs.push({ id: Number(rakutenAccount.id), label: "楽天銀行" });
    return tabs;
  }, [cashAccount, rakutenAccount]);

  // selectedAccountId が null のときは全口座扱い
  const activeId = typeof selectedAccountId === "number" ? selectedAccountId : 0;

  // ✅ 子コンポーネントのPropsがブレても落ちないように “any wrapper”
  const OverviewCardAny = OverviewCard as unknown as React.ComponentType<any>;
  const BalanceCardAny = BalanceCard as unknown as React.ComponentType<any>;
  const EcoChartsAny = EcoCharts as unknown as React.ComponentType<any>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          </div>

          {/* ✅ 右上：Simulationへ */}
          <div className="flex items-center gap-2">
            <Link
              href="/simulation"
              className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900"
            >
              Simulationへ
            </Link>
          </div>
        </div>

        {/* ✅ Account Tabs */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {accountTabs.map((t) => {
            const isActive = activeId === t.id;
            return (
              <Link
                key={t.id}
                href={`/dashboard?account=${t.id}`}
                className={[
                  "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm",
                  isActive
                    ? "border-neutral-300 bg-neutral-200 text-black"
                    : "border-neutral-800 bg-neutral-950 text-white hover:bg-neutral-900",
                ].join(" ")}
              >
                {t.label}
              </Link>
            );
          })}

          <div className="ml-2 text-xs text-neutral-500">
            選択中：{" "}
            <span className="text-neutral-200">
              {activeId === 0
                ? "全口座"
                : accounts.find((a) => Number(a.id) === activeId)?.name ?? "—"}
            </span>
          </div>

          {/* “現金が出ない”ときのデバッグ用（必要なら残してOK） */}
          {/* <button
            className="ml-auto text-xs text-neutral-400 underline"
            onClick={() => console.log(accounts.map(a => ({ id: a.id, name: a.name })))}
          >
            accountsをconsoleに出す
          </button> */}
        </div>

        {/* Alerts */}
        {alertCards?.length > 0 && (
          <div className="mb-4 space-y-2">
            {alertCards.map((a, idx) => {
              const tone =
                a.severity === "critical"
                  ? "border-red-800 bg-red-950 text-red-100"
                  : a.severity === "warning"
                  ? "border-yellow-800 bg-yellow-950 text-yellow-100"
                  : "border-neutral-800 bg-neutral-950 text-neutral-100";

              return (
                <div
                  key={`${a.title}-${idx}`}
                  className={`rounded-xl border px-4 py-3 ${tone}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{a.title}</div>
                      <div className="mt-1 text-xs opacity-90">{a.description}</div>
                    </div>

                    {a.href && (
                      <Link
                        href={a.href}
                        className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-black/20 px-3 text-xs text-white hover:bg-black/30"
                      >
                        {a.actionLabel ?? "見る"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Overview：payload を要求している想定 */}
          <OverviewCardAny payload={cashStatus} />

          {/* Balance：rows を要求している想定 */}
          <BalanceCardAny rows={monthly} />

          {/* Charts：rows を要求している想定 */}
          <EcoChartsAny rows={monthly} />
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}