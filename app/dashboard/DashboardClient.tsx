// app/dashboard/DashboardClient.tsx
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

type Props = {
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  accounts: AccountRow[];
  monthly: MonthlyBalanceRow[];
  children?: ReactNode;
};

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function DashboardClient(props: Props) {
  const { children, accounts } = props;

  const pathname = usePathname();
  const sp = useSearchParams();

  const cashAccountId = toInt(sp.get("cashAccountId")) ?? null;

  const selected = cashAccountId
    ? (accounts as any[]).find((a) => a?.id === cashAccountId)
    : null;

  const accountName =
    (selected && (typeof selected.name === "string" ? selected.name : null)) ??
    (selected && (typeof selected.account_name === "string" ? selected.account_name : null)) ??
    "全口座";

  const dashboardHref = cashAccountId
    ? `/dashboard?cashAccountId=${cashAccountId}`
    : "/dashboard";

  const importHref = cashAccountId
    ? `/dashboard/import?cashAccountId=${cashAccountId}`
    : "/dashboard/import";

  const simulationHref = "/simulation";
  const fixedCostsHref = "/dashboard/fixed-costs";

  const isActive = (href: string) => {
    if (href === "/dashboard/fixed-costs") return pathname === "/dashboard/fixed-costs";
    if (href.startsWith("/dashboard/import")) return pathname === "/dashboard/import";
    if (href.startsWith("/dashboard")) return pathname === "/dashboard";
    if (href.startsWith("/simulation")) return pathname === "/simulation";
    return false;
  };

  const linkClass = (href: string) =>
    [
      "text-sm",
      "opacity-80 hover:opacity-100",
      isActive(href) ? "font-semibold opacity-100" : "",
    ].join(" ");

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-6">
              <div className="text-sm font-semibold opacity-90">Cashflow Dashboard</div>

              <nav className="flex items-center gap-4">
                <Link className={linkClass("/dashboard")} href={dashboardHref}>
                  Dashboard
                </Link>
                <Link className={linkClass("/simulation")} href={simulationHref}>
                  Simulation
                </Link>
                <Link className={linkClass("/dashboard/import")} href={importHref}>
                  楽天銀行・明細インポート
                </Link>
                <Link className={linkClass("/dashboard/fixed-costs")} href={fixedCostsHref}>
                  固定費（警告用）
                </Link>

                <div className="mx-2 h-4 w-px bg-white/20" />

                <div className="text-sm opacity-80">
                  口座: <span className="opacity-100">{accountName}</span>
                </div>
              </nav>
            </div>
          </div>
        </div>

        <div className="py-6">{children ?? null}</div>
      </div>
    </div>
  );
}