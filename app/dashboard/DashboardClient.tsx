"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

// actions（関数だけimport）
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyCashBalances } from "./_actions/getMonthlyCashBalance";

// types（ルール：_types からだけ）
import type { CashAccount, MonthlyCashBalanceRow, OverviewPayload } from "./_types";

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [month, setMonth] = useState<string>(() => {
    // 初期値：今月の1日（YYYY-MM-01）
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  });

  const [rangeMonths, setRangeMonths] = useState<number>(12);

  const [monthlyRows, setMonthlyRows] = useState<MonthlyCashBalanceRow[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const load = useCallback(async () => {
    const acc = (await getAccounts()) as CashAccount[];
    setAccounts(acc);

    const nextAccountId =
      selectedAccountId ?? (acc?.length ? acc[0].id : null);

    if (nextAccountId !== selectedAccountId) {
      setSelectedAccountId(nextAccountId);
    }

    // 口座が無いなら空で終了
    if (!nextAccountId) {
      setMonthlyRows([]);
      setOverview(null);
      return;
    }

    // 月次を取得（ここが落ちると Server Components render error に繋がりやすいので try/catch で握る）
    try {
      const rows = await getMonthlyCashBalances({
  cashAccountId: nextAccountId,
  month,
  rangeMonths,
});
      setMonthlyRows(rows);
    } catch (e) {
      console.error("getMonthlyCashBalances failed:", e);
      setMonthlyRows([]);
    }

    // overview はまだ未実装なら null のままでOK（表示側はガードしてる）
    setOverview(null);
  }, [month, rangeMonths, selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* 操作UI（最低限） */}
      <div className="flex items-center gap-3">
        <label className="text-sm opacity-80">Account</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={selectedAccountId ?? ""}
          onChange={(e) => setSelectedAccountId(Number(e.target.value))}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} / id:{a.id}
            </option>
          ))}
        </select>

        <label className="text-sm opacity-80 ml-2">Month</label>
        <input
          className="border rounded px-2 py-1 bg-transparent"
          type="month"
          value={month.slice(0, 7)}
          onChange={(e) => setMonth(`${e.target.value}-01`)}
        />

        <label className="text-sm opacity-80 ml-2">Range</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={rangeMonths}
          onChange={(e) => setRangeMonths(Number(e.target.value))}
        >
          <option value={2}>last 2 months</option>
          <option value={6}>last 6 months</option>
          <option value={12}>last 12 months</option>
        </select>

        <button
          className="border rounded px-3 py-1"
          onClick={() => void load()}
        >
          refresh
        </button>
      </div>

      <div className="space-y-4">
        {selectedAccount && overview ? (
          <OverviewCard accountName={selectedAccount.name} payload={overview} />
        ) : (
          <div className="text-sm opacity-60">Overview not available</div>
        )}

        <BalanceCard rows={monthlyRows} />
      </div>

      <EcoCharts rows={monthlyRows} />

      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month:{" "}
        {month}
      </div>
    </div>
  );
}