// app/dashboard/DashboardClient.tsx
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { AccountRow, MonthlyBalanceRow, CashStatus, AlertCard } from "./_types";

function yen(n: number | null | undefined) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return `${n.toLocaleString()} 円`;
}

function severityBadge(sev: AlertCard["severity"]) {
  // 色は “暗黙依存” を避けて明示（Fast Refresh でも崩さない）
  if (sev === "critical") return "bg-red-600/20 text-red-200 border border-red-400/20";
  if (sev === "warning") return "bg-yellow-600/20 text-yellow-200 border border-yellow-400/20";
  return "bg-sky-600/20 text-sky-200 border border-sky-400/20";
}

export default function DashboardClient(props: {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus;
  alertCards: AlertCard[];
}) {
  const router = useRouter();

  const selectedAccount = useMemo(() => {
    if (!props.selectedAccountId) return null;
    return props.accounts.find((a) => a.id === props.selectedAccountId) ?? null;
  }, [props.accounts, props.selectedAccountId]);

  const onChangeAccount = (id: number) => {
    router.push(`/dashboard?account=${id}`);
  };

  const hasAccounts = props.accounts.length > 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Cashflow Dashboard</h1>

        <div className="flex items-center gap-3">
          <label className="text-sm text-white/80">Account</label>

          <select
            className="rounded-md bg-zinc-900 text-white border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
            value={props.selectedAccountId ?? ""}
            onChange={(e) => onChangeAccount(Number(e.target.value))}
            disabled={!hasAccounts}
          >
            {!hasAccounts ? (
              <option value="">No accounts</option>
            ) : (
              props.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))
            )}
          </select>
        </div>
      </header>

      <main className="px-6 pb-10">
        {/* ✅ 現在地（最重要） */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm text-white/70">選択中口座</div>
            <div className="mt-1 text-base font-semibold text-white">
              {selectedAccount ? selectedAccount.name : "None"}
            </div>
            <div className="mt-3 text-sm text-white/70">現在残高</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {selectedAccount ? yen(Number(selectedAccount.current_balance)) : "-"}
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm text-white/70">今月の収支（最新月: {props.cashStatus.monthLabel ?? "-" }）</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-white/70">収入</div>
                <div className="mt-1 text-white">{yen(props.cashStatus.monthIncome)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-white/70">支出</div>
                <div className="mt-1 text-white">{yen(props.cashStatus.monthExpense)}</div>
              </div>
              <div className="col-span-2 rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="text-white/70">差額</div>
                <div className="mt-1 text-white">{yen(props.cashStatus.monthNet)}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/50">
              updated: {props.cashStatus.updatedAtISO}
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">危険信号</div>

            {props.alertCards.length === 0 ? (
              <div className="mt-3 text-sm text-white/70">いまのところアラートはありません。</div>
            ) : (
              <div className="mt-3 space-y-3">
                {props.alertCards.map((a, idx) => (
                  <div key={`${a.title}-${idx}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs ${severityBadge(a.severity)}`}>
                            {a.severity.toUpperCase()}
                          </span>
                          <div className="text-sm font-semibold text-white truncate">{a.title}</div>
                        </div>
                        <div className="mt-1 text-sm text-white/70">{a.description}</div>
                      </div>

                      {a.href ? (
                        <button
                          className="shrink-0 rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-xs text-white hover:bg-zinc-800"
                          onClick={() => router.push(a.href!)}
                        >
                          {a.actionLabel ?? "開く"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ✅ 参考：月次テーブル（今は残してOK。重くなったら Simulation に移す） */}
        <div className="mt-6 rounded-xl border border-white/15 bg-zinc-950 p-4">
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
                      <td className="py-2 pr-4 text-right">{Number(r.income).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right">{Number(r.expense).toLocaleString()}</td>
                      <td className="py-2 text-right">{Number(r.balance).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}