// app/simulation/simulation-client.tsx
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { CashAccount } from "@/app/dashboard/_types";
import type { SimulationResult } from "./_actions/getSimulation";

export default function SimulationClient(props: {
  accounts: CashAccount[];
  selectedAccountId: number | null;
  simulation: SimulationResult | null;
}) {
  const router = useRouter();

  const selected = useMemo(() => {
    if (!props.selectedAccountId) return null;
    return props.accounts.find((a) => a.id === props.selectedAccountId) ?? null;
  }, [props.accounts, props.selectedAccountId]);

  const onChangeAccount = (id: number) => {
    router.push(`/simulation?account=${id}`);
  };

  const badge = (level: SimulationResult["level"]) => {
    if (level === "danger") return { label: "CRITICAL", cls: "bg-red-950 border-red-500/30 text-red-200" };
    if (level === "short") return { label: "SHORT", cls: "bg-red-950 border-red-500/30 text-red-200" };
    if (level === "warn") return { label: "WARN", cls: "bg-amber-950 border-amber-500/30 text-amber-200" };
    return { label: "SAFE", cls: "bg-emerald-950 border-emerald-500/30 text-emerald-200" };
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-xs text-white/60">Cashflow Dashboard</div>
          <h1 className="text-xl font-semibold text-white">Simulation</h1>
        </div>

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

      <main className="px-6 pb-10 space-y-6">
        <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
          <div className="text-sm text-white/70">Selected</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {selected ? selected.name : "None"}
          </div>
          <div className="mt-2 text-sm text-white/70">
            Current Balance:{" "}
            <span className="text-white">
              {selected ? `${Number(selected.current_balance).toLocaleString()} 円` : "-"}
            </span>
          </div>
        </div>

        {!props.simulation ? (
          <div className="rounded-xl border border-white/15 bg-zinc-950 p-6 text-white/70">
            No simulation data.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
                <div className="text-sm font-semibold text-white">平均（直近 {props.simulation.avgWindowMonths} ヶ月）</div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-white/80">
                    <span>収入</span>
                    <span className="text-white">{props.simulation.avgIncome.toLocaleString()} 円</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>支出</span>
                    <span className="text-white">{props.simulation.avgExpense.toLocaleString()} 円</span>
                  </div>
                  <div className="flex justify-between text-white/80">
                    <span>差額</span>
                    <span className="text-white">{props.simulation.avgNet.toLocaleString()} 円</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
                <div className="text-sm font-semibold text-white">予測（{props.simulation.horizonMonths} ヶ月）</div>
                <div className="mt-3 text-sm text-white/80">
                  ショート月：{" "}
                  <span className="text-white">
                    {props.simulation.shortMonth ? props.simulation.shortMonth : "なし"}
                  </span>
                </div>
                <div className="mt-3 text-sm text-white/60">
                  ※モデル：平均収支（固定）で単純に積み上げ
                </div>
              </div>

              <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
                <div className="text-sm font-semibold text-white">判定</div>
                <div className="mt-3 flex items-start gap-3">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${badge(props.simulation.level).cls}`}
                  >
                    {badge(props.simulation.level).label}
                  </span>
                  <div className="text-sm text-white/80 leading-relaxed">
                    {props.simulation.message}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
              <div className="text-sm font-semibold text-white">月別 着地（予測）</div>
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-white/70">
                    <tr>
                      <th className="text-left py-2 pr-4">month</th>
                      <th className="text-right py-2 pr-4">assumed net</th>
                      <th className="text-right py-2">projected balance</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {props.simulation.rows.map((r) => (
                      <tr key={r.month} className="border-t border-white/10">
                        <td className="py-2 pr-4">{r.month}</td>
                        <td className="py-2 pr-4 text-right">
                          {Number(r.net_assumed).toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          {Number(r.projected_balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}