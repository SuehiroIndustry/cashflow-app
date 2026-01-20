"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

// actions（関数だけimport）
import { getAccounts } from "./_actions/getAccounts";

// types（ルール：_types からだけ）
import type { CashAccount, MonthlyBalanceRow, OverviewPayload } from "./_types";

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  // いったん月次は空配列（getMonthlyBalance が無いので依存を切る）
  const [monthlyRows, setMonthlyRows] = useState<MonthlyBalanceRow[]>([]);

  // overview も今は取得してないので null のまま
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const load = useCallback(async () => {
    const acc = (await getAccounts()) as CashAccount[];
    setAccounts(acc);

    if (acc?.length && selectedAccountId == null) {
      setSelectedAccountId(acc[0].id);
    }

    // getMonthlyBalance が無いので空
    setMonthlyRows([]);

    // overview も今は取得してないので null 維持
    setOverview(null);
  }, [selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* OverviewCard は payload が必須なので、揃った時だけ表示 */}
        {selectedAccount && overview ? (
          <OverviewCard accountName={selectedAccount.name} payload={overview} />
        ) : null}

        <BalanceCard rows={monthlyRows} />
      </div>

      <EcoCharts rows={monthlyRows} />

      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"}
      </div>
    </div>
  );
}