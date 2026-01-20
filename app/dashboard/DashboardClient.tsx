// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyCashBalances } from "./_actions/getMonthlyCashBalances";

import type {
  CashAccount,
  MonthlyCashBalanceRow,
  OverviewPayload,
} from "./_types";

function toMonthStartISO(yyyymm: string): string {
  // "2026年01月" → "2026-01-01"
  const m = yyyymm.match(/^(\d{4})\D+(\d{1,2})/);
  if (m) {
    const y = m[1];
    const mm = String(Number(m[2])).padStart(2, "0");
    return `${y}-${mm}-01`;
  }

  // "YYYY-MM" → "YYYY-MM-01"
  const m2 = yyyymm.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}-01`;

  // "YYYY-MM-DD" ならそのまま
  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyymm)) return yyyymm;

  // 保険：今月
  const d = new Date();
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${mm}-01`;
}

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [monthText, setMonthText] = useState<string>("2026年01月");
  const [rangeMonths, setRangeMonths] = useState<number>(12);

  // ✅ ここが肝：返り値に合わせて MonthlyCashBalanceRow[]
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

    if (nextAccountId != null && selectedAccountId == null) {
      setSelectedAccountId(nextAccountId);
    }

    if (nextAccountId != null) {
      const month = toMonthStartISO(monthText);

      try {
        const rows = await getMonthlyCashBalances({
          cashAccountId: nextAccountId,
          month,
          rangeMonths,
        });

        // 表示が昇順前提ならここで昇順に
        const asc = [...rows].sort((a, b) => a.month.localeCompare(b.month));
        setMonthlyRows(asc);

        // デバッグしたいなら一旦これ入れとくと速い
        // console.log("monthly rows:", asc);
      } catch (e) {
        console.error(e);
        setMonthlyRows([]);
      }
    } else {
      setMonthlyRows([]);
    }

    // overview はまだ作ってないなら null のままでOK
    setOverview(null);
  }, [monthText, rangeMonths, selectedAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm opacity-80">Account</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={selectedAccountId ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedAccountId(v === "" ? null : Number(v));
          }}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} / id:{a.id}
            </option>
          ))}
        </select>

        <label className="text-sm opacity-80 ml-4">Month</label>
        <input
          className="border rounded px-2 py-1 bg-transparent"
          value={monthText}
          onChange={(e) => setMonthText(e.target.value)}
        />

        <label className="text-sm opacity-80 ml-4">Range</label>
        <select
          className="border rounded px-2 py-1 bg-transparent"
          value={rangeMonths}
          onChange={(e) => setRangeMonths(Number(e.target.value))}
        >
          <option value={2}>last 2 months</option>
          <option value={6}>last 6 months</option>
          <option value={12}>last 12 months</option>
          <option value={24}>last 24 months</option>
        </select>

        <button
          className="border rounded px-3 py-1 ml-2"
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
        {toMonthStartISO(monthText)}
      </div>
    </div>
  );
}