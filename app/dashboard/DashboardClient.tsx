"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

// actions
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyCashBalances } from "./_actions/getMonthlyCashBalance";
import { getOverview } from "./_actions/getOverview";

// types（ルール：_types からだけ）
import type { CashAccount, MonthlyCashBalanceRow, OverviewPayload } from "./_types";

function monthStartISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function addMonths(monthISO: string, delta: number) {
  const [y, m] = monthISO.split("-").map((v) => Number(v));
  const dt = new Date(y, m - 1 + delta, 1);
  return monthStartISO(dt);
}

export default function DashboardClient() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>(monthStartISO(new Date()));
  const [monthlyRows, setMonthlyRows] = useState<MonthlyCashBalanceRow[]>([]);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAccount = useMemo(() => {
    if (selectedAccountId == null) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const acc = (await getAccounts()) as CashAccount[];
      setAccounts(acc);

      const accountId =
        selectedAccountId ?? (acc?.length ? acc[0].id : null);

      if (accountId == null) {
        setSelectedAccountId(null);
        setMonthlyRows([]);
        setOverview(null);
        return;
      }

      if (selectedAccountId == null) setSelectedAccountId(accountId);

      // last 12 months
      const toMonth = selectedMonth;
      const fromMonth = addMonths(selectedMonth, -11);

      const rows = await getMonthlyCashBalances({
        cash_account_id: accountId,
        from_month: fromMonth,
        to_month: toMonth,
      });

      setMonthlyRows(rows);

      const ov = await getOverview({
        cash_account_id: accountId,
        month: selectedMonth,
      });

      setOverview(ov);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Unknown error");
      setMonthlyRows([]);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, selectedMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="opacity-80">Account:</div>
        <select
          className="rounded border px-2 py-1 bg-transparent"
          value={selectedAccountId ?? ""}
          onChange={(e) => setSelectedAccountId(Number(e.target.value))}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} / id:{a.id}
            </option>
          ))}
        </select>

        <div className="opacity-80">Month:</div>
        <input
          className="rounded border px-2 py-1 bg-transparent"
          type="month"
          value={selectedMonth.slice(0, 7)}
          onChange={(e) => {
            const v = e.target.value; // "YYYY-MM"
            setSelectedMonth(`${v}-01`);
          }}
        />

        <button
          className="rounded border px-3 py-1 hover:opacity-80"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "loading..." : "refresh"}
        </button>
      </div>

      {errorMsg ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
          {errorMsg}
        </div>
      ) : null}

      <div className="space-y-4">
        {selectedAccount && overview ? (
          <OverviewCard accountName={selectedAccount.name} payload={overview} />
        ) : (
          <div className="text-sm opacity-60">
            {loading ? "Overview loading..." : "Overview not available"}
          </div>
        )}

        <BalanceCard rows={monthlyRows} />
      </div>

      <EcoCharts rows={monthlyRows} />

      <div className="text-xs opacity-60">
        selectedAccount: {selectedAccount ? selectedAccount.name : "none"} / month:{" "}
        {selectedMonth}
      </div>
    </div>
  );
}