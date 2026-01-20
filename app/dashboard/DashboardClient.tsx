"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

// actions（関数だけimport）
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

// types（ルール：_types からだけ）
import type {
  CashAccount,
  CashCategory,
  CashFlowCreateInput,
  CashFlowListRow,
  MonthlyBalanceRow,
  OverviewPayload,
} from "./_types";

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthlyRows, setMonthlyRows] = useState<MonthlyBalanceRow[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  // ここは実装に合わせて保持（実際のコードがもっとあるはずなので最低限だけ）
  const load = useCallback(async () => {
    const acc = await getAccounts();
    // getAccounts の戻りが AccountRow[] でも、最低限 {id,name} があれば CashAccount と互換になる
    setAccounts(acc as CashAccount[]);
    if (acc?.length && selectedAccountId == null) {
      setSelectedAccountId((acc[0] as any).id);
    }

    const mb = await getMonthlyBalance();
    setMonthlyRows(mb as MonthlyBalanceRow[]);
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
      {/* 実際のUIは既存コンポーネントに委譲されてる想定 */}
      <div className="space-y-4">
        <OverviewCard overview={overview} />
        <BalanceCard rows={monthlyRows} />
      </div>

      <EcoCharts rows={monthlyRows} />

      {/* デバッグ用：最低限 */}
      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"}
      </div>
    </div>
  );
}