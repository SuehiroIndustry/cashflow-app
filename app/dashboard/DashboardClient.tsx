"use client";

import React, { useMemo } from "react";
import Link from "next/link";

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
  children?: React.ReactNode;
};

export default function DashboardClient(props: Props) {
  const { accounts, selectedAccountId, monthly, cashStatus, alertCards, children } = props;

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const latestMonth = useMemo(() => {
    if (!monthly.length) return null;
    return monthly[monthly.length - 1];
  }, [monthly]);

  const overviewPayload: OverviewPayload = useMemo(() => {
    const accountName =
      selectedAccount?.name ??
      cashStatus?.selectedAccountName ??
      (selectedAccountId ? "選択中口座" : "全口座");

    const currentBalance =
      typeof cashStatus?.currentBalance === "number"
        ? cashStatus.currentBalance
        : typeof selectedAccount?.current_balance === "number"
          ? selectedAccount.current_balance
          : 0;

    const thisMonthIncome =
      typeof cashStatus?.monthIncome === "number"
        ? cashStatus.monthIncome
        : typeof latestMonth?.income === "number"
          ? latestMonth.income
          : 0;

    const thisMonthExpense =
      typeof cashStatus?.monthExpense === "number"
        ? cashStatus.monthExpense
        : typeof latestMonth?.expense === "number"
          ? latestMonth.expense
          : 0;

    const net =
      typeof cashStatus?.monthNet === "number"
        ? cashStatus.monthNet
        : thisMonthIncome - thisMonthExpense;

    return {
      cashAccountId: selectedAccountId ?? undefined,
      accountName,
      currentBalance,
      thisMonthIncome,
      thisMonthExpense,
      net,
    };
  }, [selectedAccount, selectedAccountId, cashStatus, latestMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Dashboard</div>
          <div className="text-sm opacity-70">
            更新: {cashStatus?.updatedAtISO ? new Date(cashStatus.updatedAtISO).toLocaleString("ja-JP") : "-"}
          </div>
        </div>

        {/* ✅ 追加したいリンク：楽天CSVアップロード */}
        <div className="flex gap-2">
          <Link
            href="/cash/import/rakuten"
            className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
          >
            楽天CSVアップロード
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alertCards?.length ? (
        <div className="space-y-2">
          {alertCards.map((a, idx) => (
            <div
              key={`${a.title}-${idx}`}
              className="rounded-xl border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm opacity-80 mt-1">{a.description}</div>
                </div>

                {a.href && a.actionLabel ? (
                  <Link
                    href={a.href}
                    className="shrink-0 rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
                  >
                    {a.actionLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Main cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={overviewPayload} />
        <BalanceCard rows={monthly} />
        <EcoCharts rows={monthly} />
      </div>

      {/* extra */}
      {children ? <div>{children}</div> : null}
    </div>
  );
}