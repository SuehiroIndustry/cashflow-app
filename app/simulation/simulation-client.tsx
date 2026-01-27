// app/simulation/simulation-client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * page.tsx 側が accounts: AccountRow[] を渡してくる前提。
 * ここでは最小要件（id, name）だけ満たせばOKにしておく。
 */
type AccountLike = {
  id: number;
  name: string;
};

/**
 * サーバー側の simulation 結果。
 * いま手元の実装差分が多いので「必要なものだけ」厳密にして、
 * 足りない/余分は許容する形にする。
 */
type SimulationRow = {
  month: string; // "YYYY-MM" or "YYYY-MM-01"
  assumedNet?: number;
  projectedBalance?: number;
  // 既存が balance だった場合も吸収
  balance?: number;
};

type SimulationResult = {
  cashAccountId: number;
  currentBalance: number;

  rangeMonths?: number; // 12など
  avgWindowMonths?: number; // 6など

  avgIncome?: number;
  avgExpense?: number;
  avgNet?: number;

  shortDate?: string | null;

  level?: "safe" | "warn" | "danger";
  message?: string;

  rows?: SimulationRow[];
};

type Props = {
  accounts: AccountLike[];
  selectedAccountId: number | null;

  // ✅ page.tsx が渡してる
  simulation: SimulationResult | null;
};

function toNumberSafe(v: string): number {
  const cleaned = v.replace(/,/g, "").trim();
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export default function SimulationClient({ accounts, selectedAccountId, simulation }: Props) {
  const router = useRouter();

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const onChangeAccount = (id: number) => {
    router.push(`/simulation?account=${id}`);
  };

  const currentBalance = Number(simulation?.currentBalance ?? 0);
  const rangeMonths = Number(simulation?.rangeMonths ?? 12);
  const avgWindowMonths = Number(simulation?.avgWindowMonths ?? 6);

  const baseAvgIncome = Number(simulation?.avgIncome ?? 0);
  const baseAvgExpense = Number(simulation?.avgExpense ?? 0);

  // ✅ 入力できない問題の本丸を潰す：state + onChange
  const [incomeInput, setIncomeInput] = useState<string>(String(Math.round(baseAvgIncome)));
  const [expenseInput, setExpenseInput] = useState<string>(String(Math.round(baseAvgExpense)));

  // 口座切替 or simulation 更新で初期値追従
  useEffect(() => {
    setIncomeInput(String(Math.round(Number(simulation?.avgIncome ?? 0))));
    setExpenseInput(String(Math.round(Number(simulation?.avgExpense ?? 0))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, simulation?.avgIncome, simulation?.avgExpense]);

  const assumedIncome = useMemo(() => toNumberSafe(incomeInput), [incomeInput]);
  const assumedExpense = useMemo(() => toNumberSafe(expenseInput), [expenseInput]);
  const assumedNet = useMemo(() => assumedIncome - assumedExpense, [assumedIncome, assumedExpense]);

  // テーブル：simulation.rows があればそれを優先、無ければローカル生成
  const projectionRows = useMemo(() => {
    const rows = simulation?.rows ?? [];
    if (rows.length > 0) {
      return rows.map((r) => {
        const projected =
          r.projectedBalance ??
          r.balance ??
          0;

        return {
          month: r.month.length === 10 ? r.month.slice(0, 7) : r.month, // "YYYY-MM-01" -> "YYYY-MM"
          assumedNet: Math.round(Number(r.assumedNet ?? assumedNet)),
          projectedBalance: Math.round(Number(projected)),
        };
      });
    }

    // 無ければ “平均収支固定の単純積み上げ”
    const start = new Date();
    const base = new Date(start.getFullYear(), start.getMonth(), 1);

    let running = currentBalance;
    const out: Array<{ month: string; assumedNet: number; projectedBalance: number }> = [];

    for (let i = 1; i <= rangeMonths; i++) {
      const m = addMonths(base, i);
      running += assumedNet;
      out.push({
        month: monthKey(m),
        assumedNet: Math.round(assumedNet),
        projectedBalance: Math.round(running),
      });
    }
    return out;
  }, [simulation?.rows, currentBalance, assumedNet, rangeMonths]);

  const levelBadge = useMemo(() => {
    const lvl = simulation?.level ?? "safe";
    if (lvl === "danger") return { text: "CRITICAL", cls: "bg-red-600/20 text-red-200 border-red-400/30" };
    if (lvl === "warn") return { text: "CAUTION", cls: "bg-yellow-600/20 text-yellow-200 border-yellow-400/30" };
    return { text: "SAFE", cls: "bg-emerald-600/20 text-emerald-200 border-emerald-400/30" };
  }, [simulation?.level]);

  const forecastMessage =
    simulation?.message ??
    "現状の傾向では、直近12ヶ月で資金ショートの兆候は強くありません。";

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="text-sm text-white/70">Cashflow Dashboard</div>
          <h1 className="text-2xl font-semibold text-white">Simulation</h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-white/80">Account</label>
          <select
            className="rounded-md bg-zinc-900 text-white placeholder:text-white/40 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            value={selectedAccountId ?? ""}
            onChange={(e) => onChangeAccount(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="px-6 pb-10">
        {/* Selected */}
        <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
          <div className="text-sm text-white/80">Selected</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {selectedAccount ? selectedAccount.name : "None"}
          </div>
          <div className="mt-2 text-sm text-white/70">
            Current Balance:{" "}
            <span className="text-white">
              {currentBalance.toLocaleString()} 円
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Average */}
          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">平均（直近 {avgWindowMonths} ヶ月）</div>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="flex items-center justify-between text-white/80">
                <span>収入</span>
                <span className="text-white">{Math.round(baseAvgIncome).toLocaleString()} 円</span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <span>支出</span>
                <span className="text-white">{Math.round(baseAvgExpense).toLocaleString()} 円</span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <span>差額</span>
                <span className="text-white">
                  {Math.round(baseAvgIncome - baseAvgExpense).toLocaleString()} 円
                </span>
              </div>
            </div>
          </div>

          {/* What-if inputs */}
          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">予測（{rangeMonths} ヶ月）</div>

            <div className="mt-3 grid gap-3">
              <div className="grid gap-2">
                <div className="text-xs text-white/70">想定 収入（円 / 月）</div>
                <input
                  inputMode="numeric"
                  className="w-full rounded-md bg-zinc-900 text-white placeholder:text-white/40 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={incomeInput}
                  onChange={(e) => setIncomeInput(e.target.value)}
                  placeholder="例: 1500000"
                />
              </div>

              <div className="grid gap-2">
                <div className="text-xs text-white/70">想定 支出（円 / 月）</div>
                <input
                  inputMode="numeric"
                  className="w-full rounded-md bg-zinc-900 text-white placeholder:text-white/40 border border-white/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
                  value={expenseInput}
                  onChange={(e) => setExpenseInput(e.target.value)}
                  placeholder="例: 900000"
                />
              </div>

              <div className="pt-1 text-sm text-white/80">
                想定差額:{" "}
                <span className="text-white font-semibold">
                  {Math.round(assumedNet).toLocaleString()} 円
                </span>
              </div>

              <div className="text-xs text-white/50">
                ※モデル：平均収支（固定）で単純に積み上げ（rows があればそれを表示）
              </div>
            </div>
          </div>

          {/* Judge */}
          <div className="rounded-xl border border-white/15 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">判定</div>

            <div className="mt-3 flex items-start gap-3">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${levelBadge.cls}`}
              >
                {levelBadge.text}
              </span>
              <div className="text-sm text-white/80 leading-relaxed">
                {forecastMessage}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-xl border border-white/15 bg-zinc-950 p-4">
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
                {projectionRows.length === 0 ? (
                  <tr>
                    <td className="py-3 text-white/60" colSpan={3}>
                      No rows
                    </td>
                  </tr>
                ) : (
                  projectionRows.map((r) => (
                    <tr key={r.month} className="border-t border-white/10">
                      <td className="py-2 pr-4">{r.month}</td>
                      <td className="py-2 pr-4 text-right">{Number(r.assumedNet).toLocaleString()}</td>
                      <td className="py-2 text-right">{Number(r.projectedBalance).toLocaleString()}</td>
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