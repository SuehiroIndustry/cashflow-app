// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo, useCallback } from "react";
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

type DashboardPayload = {
  cashStatus: CashStatus | null;
  alertCards: AlertCard[];
  overviewPayload: OverviewPayload | null;
  monthly: MonthlyBalanceRow[];
};

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  payload: DashboardPayload;
  children?: React.ReactNode;
};

function toInt(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function DashboardClient(props: Props) {
  const { accounts, selectedAccountId, payload, children } = props;
  const router = useRouter();

  const accountOptions = useMemo(() => {
    return (accounts ?? []).map((a) => ({
      id: a.id,
      name: a.name,
    }));
  }, [accounts]);

  const onChangeAccount = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const id = toInt(e.target.value);
      const qs = id ? `?cashAccountId=${id}` : "";
      router.push(`/dashboard${qs}`);
    },
    [router]
  );

  const hasSelected = selectedAccountId != null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Dashboard</div>
            <div className="text-xs opacity-70">
              口座を選ぶと、概要・残高推移を表示します。
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs opacity-70">口座</label>
            <select
              className="h-9 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
              value={selectedAccountId ?? ""}
              onChange={onChangeAccount}
            >
              <option value="">選択してください</option>
              {accountOptions.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Optional message area */}
      {!hasSelected ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
          まずは口座を選択してください。
        </div>
      ) : null}

      {/* Main */}
      {children ? (
        children
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard payload={payload.overviewPayload} />
          <BalanceCard rows={payload.monthly} />
          <EcoCharts rows={payload.monthly} />
        </div>
      )}
    </div>
  );
}