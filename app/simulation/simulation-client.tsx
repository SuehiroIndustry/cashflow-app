"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { AccountRow } from "@/app/dashboard/_actions/getAccounts";

// ✅ ここは “サーバーから渡ってくる simulation の形” に合わせる
// 既存の getSimulation の戻りに合わせて調整してOK
export type SimulationLevel = "safe" | "warn" | "danger" | "short";

export type SimulationRow = {
  month: string; // "YYYY-MM" or "YYYY-MM-01" など
  assumedNet: number;
  projectedBalance: number;
};

export type SimulationResult = {
  cashAccountId: number;
  accountName: string;
  currentBalance: number;

  // 直近平均（初期値として使う）
  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  // 表示の基準となる “月の並び”
  months: string[]; // ex: ["2026-02", "2026-03", ...]
};

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  simulation: SimulationResult | null;
};

function normalizeMonthLabel(m: string) {
  // "YYYY-MM-01" を "YYYY-MM" に寄せる
  if (/^\d{4}-\d{2}-\d{2}$/.test(m)) return m.slice(0, 7);
  return m;
}

function toInt(v: string, fallback = 0) {
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export default function SimulationClient({
  accounts,
  selectedAccountId,
  simulation,
}: Props) {
  // ✅ 初期値（simulation が来たらそこから入れる）
  const [assumedIncome, setAssumedIncome] = useState<number>(0);
  const [assumedExpense, setAssumedExpense] = useState<number>(0);

  useEffect(() => {
    if (!simulation) return;
    setAssumedIncome(Math.round(simulation.avgIncome ?? 0));
    setAssumedExpense(Math.round(simulation.avgExpense ?? 0));
  }, [simulation?.cashAccountId]); // 口座切替時に追従

  const currentBalance = useMemo(() => {
    return Math.round(simulation?.currentBalance ?? 0);
  }, [simulation]);

  const months = useMemo(() => {
    const ms = simulation?.months ?? [];
    return ms.map(normalizeMonthLabel);
  }, [simulation]);

  const assumedNet = useMemo(() => {
    return Math.round((assumedIncome ?? 0) - (assumedExpense ?? 0));
  }, [assumedIncome, assumedExpense]);

  // ✅ ここが本丸：入力から rows を作る（毎回再計算）
  const rows: SimulationRow[] = useMemo(() => {
    let running = currentBalance;
    return months.map((month) => {
      running += assumedNet;
      return {
        month,
        assumedNet,
        projectedBalance: Math.round(running),
      };
    });
  }, [months, currentBalance, assumedNet]);

  // ✅ 判定（ざっくり運用ルール）
  const { level, shortMonth, message } = useMemo(() => {
    // ショート判定：初めて projectedBalance が 0 を割る月
    const short = rows.find((r) => r.projectedBalance < 0)?.month ?? null;

    if (short) {
      return {
        level: "short" as SimulationLevel,
        shortMonth: short,
        message: `資金ショート見込み：${short}（この月に残高がマイナスになります）`,
      };
    }

    // warn 判定：平均差額がマイナス or 余裕が薄い
    // ※このルールは後で好きに調整してOK
    if (assumedNet < 0) {
      return {
        level: "warn" as SimulationLevel,
        shortMonth: null,
        message:
          "現状の想定では、毎月の差額がマイナスです。固定費圧縮か収入の底上げを検討してください。",
      };
    }

    // “3ヶ月分の支出” を切ったら注意（現場ルール）
    if (currentBalance < (assumedExpense || 0) * 3) {
      return {
        level: "warn" as SimulationLevel,
        shortMonth: null,
        message:
          "残高の余裕が薄めです（目安：支出3ヶ月分未満）。入金遅延・突発支出に備えてください。",
      };
    }

    return {
      level: "safe" as SimulationLevel,
      shortMonth: null,
      message: "現状の想定では、直近12ヶ月で資金ショートの兆候は強くありません。",
    };
  }, [rows, assumedNet, currentBalance, assumedExpense]);

  const selectedAccountName = useMemo(() => {
    const a = accounts.find((x) => x.id === selectedAccountId);
    return a?.name ?? "";
  }, [accounts, selectedAccountId]);

  return (
    <div className="space-y-6">
      {/* Selected */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/70">Selected</div>
        <div className="mt-1 text-lg font-semibold text-white">
          {selectedAccountName || simulation?.accountName || "-"}
        </div>
        <div className="mt-2 text-sm text-white/80">
          Current Balance:{" "}
          <span className="font-semibold text-white">
            {currentBalance.toLocaleString()} 円
          </span>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Average */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">
            平均（直近 6 ヶ月）
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex items-center justify-between text-white/80">
              <span>収入</span>
              <span className="font-semibold text-white">
                {Math.round(simulation?.avgIncome ?? 0).toLocaleString()} 円
              </span>
            </div>
            <div className="flex items-center justify-between text-white/80">
              <span>支出</span>
              <span className="font-semibold text-white">
                {Math.round(simulation?.avgExpense ?? 0).toLocaleString()} 円
              </span>
            </div>
            <div className="flex items-center justify-between text-white/80">
              <span>差額</span>
              <span className="font-semibold text-white">
                {Math.round(simulation?.avgNet ?? 0).toLocaleString()} 円
              </span>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">予測（12 ヶ月）</div>

          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs text-white/70">想定 収入（月 / 月）</div>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={assumedIncome}
                onChange={(e) => setAssumedIncome(toInt(e.target.value, 0))}
              />
            </div>

            <div>
              <div className="text-xs text-white/70">想定 支出（月 / 月）</div>
              <input
                type="number"
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                value={assumedExpense}
                onChange={(e) => setAssumedExpense(toInt(e.target.value, 0))}
              />
            </div>

            <div className="text-sm text-white/80">
              想定差額:{" "}
              <span className="font-semibold text-white">
                {assumedNet.toLocaleString()} 円
              </span>
            </div>
            <div className="text-xs text-white/50">
              ※モデル：入力値（固定）で単純に積み上げ（＝いまは What-if 用）
            </div>
          </div>
        </div>

        {/* Judge */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold text-white">判定</div>

          <div className="mt-3 flex items-start gap-3">
            <div className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white">
              {level.toUpperCase()}
            </div>
            <div className="text-sm text-white/80">{message}</div>
          </div>

          {shortMonth && (
            <div className="mt-3 text-xs text-white/60">
              ショート月: <span className="text-white">{shortMonth}</span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white">月別 着地（予測）</div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-white/60">
              <tr className="border-b border-white/10">
                <th className="py-2 text-left font-medium">month</th>
                <th className="py-2 text-right font-medium">assumed net</th>
                <th className="py-2 text-right font-medium">
                  projected balance
                </th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-white/5">
                  <td className="py-2 text-left">{r.month}</td>
                  <td className="py-2 text-right">
                    {r.assumedNet.toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    {r.projectedBalance.toLocaleString()}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="py-3 text-white/60" colSpan={3}>
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}