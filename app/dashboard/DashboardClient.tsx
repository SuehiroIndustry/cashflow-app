"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

// actions（関数だけimport）
import { getAccounts } from "./_actions/getAccounts";

// types（ルール：_types からだけ）
import type {
  CashAccount,
  MonthlyBalanceRow,
  OverviewPayload,
} from "./_types";

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // いったん月次は空配列（getMonthlyBalance が無いので依存を切る）
  const [monthlyRows, setMonthlyRows] = useState<MonthlyBalanceRow[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const load = useCallback(async () => {
    const acc = await getAccounts();
    setAccounts(acc as CashAccount[]);

    if (acc?.length && selectedAccountId == null) {
      setSelectedAccountId((acc[0] as any).id);
    }

    // getMonthlyBalance が存在しないので、ここでは触らない
    setMonthlyRows([]);
  }, [selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <OverviewCard overview={overview} />
        <BalanceCard rows={monthlyRows} />
      </div>

      <EcoCharts rows={monthlyRows} />

      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"}
      </div>
    </div>
  );
}