// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

type AccountRow = {
  id: number;
  name: string;
  current_balance: number;
};

type MonthlyBalanceRow = {
  cash_account_id: number;
  month: string;
  income: number;
  expense: number;
  balance: number;
};

export default function DashboardClient(props: {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: any | null;
  alertCards: any[];
  children?: React.ReactNode;
}) {
  const router = useRouter();

  const selectedAccount = useMemo(() => {
    if (!props.selectedAccountId) return null;
    return props.accounts.find((a) => a.id === props.selectedAccountId) ?? null;
  }, [props.accounts, props.selectedAccountId]);

  const onChangeAccount = (id: number) => {
    router.push(`/dashboard?account=${id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Cashflow Dashboard</h1>

        <div className="flex items-center gap-3">
          <label className="text-sm text-white/80">Account</label>
          <select
            className="rounded-md bg-zinc-900 text-white border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            value={props.selectedAccountId ?? ""}
            onChange={(e) => onChangeAccount(Number(e.target.value))}
          >
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="px-6 pb-10">
        <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
          <div className="text-sm text-white/80">
            Selected:{" "}
            <span className="text-white">
              {selectedAccount ? selectedAccount.name : "None"}
            </span>
          </div>
          <div className="mt-2 text-sm text-white/80">
            Current Balance:{" "}
            <span className="text-white">
              {selectedAccount
                ? `${Number(selectedAccount.current_balance).toLocaleString()} 円`
                : "-"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">月次（一覧）</div>
            <div className="mt-3 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-white/70">
                  <tr>
                    <th className="text-left py-2 pr-4">month</th>
                    <th className="text-right py-2 pr-4">income</th>
                    <th className="text-right py-2 pr-4">expense</th>
                    <th className="text-right py-2">balance</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {props.monthly.length === 0 ? (
                    <tr>
                      <td className="py-3 text-white/60" colSpan={4}>
                        No rows
                      </td>
                    </tr>
                  ) : (
                    props.monthly.map((r) => (
                      <tr key={r.month} className="border-t border-white/10">
                        <td className="py-2 pr-4">{r.month}</td>
                        <td className="py-2 pr-4 text-right">
                          {Number(r.income).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-right">
                          {Number(r.expense).toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {Number(r.balance).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">アラート</div>
            <div className="mt-3 text-sm text-white/70">
              {props.alertCards.length === 0
                ? "No alerts (yet)"
                : `${props.alertCards.length} alerts`}
            </div>
          </div>
        </div>

        {props.children ? <div className="mt-6">{props.children}</div> : null}
      </main>
    </div>
  );
}