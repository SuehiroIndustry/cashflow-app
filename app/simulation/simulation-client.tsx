"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AccountRow,
  CashShortForecast,
  MonthlyBalanceRow,
} from "@/app/dashboard/_types";

// ここはあなたの実装に合わせて import してOK
// すでに _actions/getSimulation.ts で返している型を使ってるなら、それに寄せてね
export type SimulationLevel = "safe" | "warn" | "danger";

export type SimulationMonthRow = {
  month: string; // "YYYY-MM"
  assumedNet: number;
  projectedBalance: number;
};

export type SimulationResult = {
  cashAccountId: number;
  accountName: string;
  currentBalance: number;

  // 直近平均（参考表示）
  avgIncome: number;
  avgExpense: number;
  avgNet: number;

  // 判定
  level: SimulationLevel;
  message: string;

  // 予測（テーブル）
  months: SimulationMonthRow[];

  // 必要なら将来拡張（ショート予測を載せる）
  shortForecast?: CashShortForecast | null;
  monthlyBalances?: MonthlyBalanceRow[]; // 使ってなければ消してOK
};

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  simulation: SimulationResult | null;
};

function formatJPY(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP").format(Math.round(n)) + " 円";
}

function clampNumberString(v: string) {
  // 数字以外を落とす（空は許容）
  const s = v.replace(/[^\d]/g, "");
  return s;
}

export default function SimulationClient({
  accounts,
  selectedAccountId,
  simulation,
}: Props) {
  const router = useRouter();

  const selected = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => Number(a.id) === Number(selectedAccountId)) ?? null;
  }, [accounts, selectedAccountId]);

  // 初期値：simulationの平均値を使う
  const [assumedIncome, setAssumedIncome] = useState<string>(() =>
    simulation ? String(Math.round(simulation.avgIncome)) : ""
  );
  const [assumedExpense, setAssumedExpense] = useState<string>(() =>
    simulation ? String(Math.round(simulation.avgExpense)) : ""
  );

  const assumedIncomeNum = useMemo(
    () => Number(assumedIncome || 0),
    [assumedIncome]
  );
  const assumedExpenseNum = useMemo(
    () => Number(assumedExpense || 0),
    [assumedExpense]
  );

  const assumedNet = useMemo(
    () => assumedIncomeNum - assumedExpenseNum,
    [assumedIncomeNum, assumedExpenseNum]
  );

  // months は「入力値に合わせて」画面側で再計算（サーバー再フェッチ無しでも結果が変わる）
  const months = useMemo<SimulationMonthRow[]>(() => {
    if (!simulation) return [];
    const base = simulation.currentBalance;
    const src = simulation.months ?? [];
    // month配列の長さだけ再計算（month文字列はそのまま使う）
    let running = base;
    return src.map((m) => {
      running += assumedNet;
      return {
        month: m.month,
        assumedNet: Math.round(assumedNet),
        projectedBalance: Math.round(running),
      };
    });
  }, [simulation, assumedNet]);

  const level = simulation?.level ?? "safe";
  const badge = useMemo(() => {
    // 色も明示（テーマ依存ゼロ）
    if (level === "danger") {
      return {
        label: "CRITICAL",
        className:
          "inline-flex items-center rounded-full border border-red-800 bg-red-950 px-2.5 py-1 text-xs font-semibold text-red-200",
      };
    }
    if (level === "warn") {
      return {
        label: "CAUTION",
        className:
          "inline-flex items-center rounded-full border border-yellow-800 bg-yellow-950 px-2.5 py-1 text-xs font-semibold text-yellow-200",
      };
    }
    return {
      label: "SAFE",
      className:
        "inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-semibold text-emerald-200",
    };
  }, [level]);

  const pageBase =
    "min-h-screen bg-black text-white"; // ← ここで白化を封殺
  const shell =
    "mx-auto w-full max-w-6xl px-4 py-6";
  const gridTop =
    "grid gap-4 md:grid-cols-3";

  const card =
    "rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm";
  const cardHead =
    "px-5 pt-4 text-sm font-semibold text-white";
  const cardBody =
    "px-5 pb-5 pt-3 text-sm text-neutral-200";
  const label =
    "text-xs text-neutral-400";
  const value =
    "text-base font-semibold text-white";

  const inputBase =
    "h-10 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";

  return (
    <div className={pageBase}>
      <div className={shell}>
        <div className="mb-6">
          <div className="text-xs text-neutral-400">Cashflow Dashboard</div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Simulation
          </h1>
        </div>

        {/* Selected */}
        <div className={`${card} mb-4`}>
          <div className={cardBody}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-neutral-400">Selected</div>
                <div className="text-lg font-semibold text-white">
                  {selected?.name ?? simulation?.accountName ?? "—"}
                </div>
                <div className="mt-1 text-sm text-neutral-300">
                  Current Balance:{" "}
                  <span className="font-semibold text-white">
                    {formatJPY(simulation?.currentBalance ?? 0)}
                  </span>
                </div>
              </div>

              {/* Account selector (URLで切り替える想定) */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-400">Account</span>
                <select
                  className="h-9 rounded-md border border-neutral-800 bg-neutral-900 px-3 text-sm text-white"
                  value={selectedAccountId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    // account=0 は全体とかの仕様なら調整して
                    if (!v) return;
                    router.push(`/simulation?account=${v}`);
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3 cards */}
        <div className={gridTop}>
          {/* Average */}
          <div className={card}>
            <div className={cardHead}>平均（直近 6ヶ月）</div>
            <div className={cardBody}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={label}>収入</span>
                  <span className={value}>
                    {formatJPY(simulation?.avgIncome ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={label}>支出</span>
                  <span className={value}>
                    {formatJPY(simulation?.avgExpense ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={label}>差額</span>
                  <span className={value}>
                    {formatJPY(simulation?.avgNet ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className={card}>
            <div className={cardHead}>予測（12ヶ月）</div>
            <div className={cardBody}>
              <div className="space-y-3">
                <div>
                  <div className={label}>想定 収入（月 / 月）</div>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    value={assumedIncome}
                    onChange={(e) =>
                      setAssumedIncome(clampNumberString(e.target.value))
                    }
                    placeholder="例）1200000"
                  />
                </div>
                <div>
                  <div className={label}>想定 支出（月 / 月）</div>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    value={assumedExpense}
                    onChange={(e) =>
                      setAssumedExpense(clampNumberString(e.target.value))
                    }
                    placeholder="例）900000"
                  />
                </div>

                <div className="pt-1 text-sm text-neutral-300">
                  想定差額：{" "}
                  <span className="font-semibold text-white">
                    {formatJPY(assumedNet)}
                  </span>
                </div>

                <div className="text-xs text-neutral-500">
                  ※モデル：平均収支（固定）で単純に積み上げ（rows があればそれを表示）
                </div>
              </div>
            </div>
          </div>

          {/* Judge */}
          <div className={card}>
            <div className={cardHead}>判定</div>
            <div className={cardBody}>
              <div className="flex items-start gap-3">
                <span className={badge.className}>{badge.label}</span>
                <div className="text-sm text-neutral-200">
                  {simulation?.message ??
                    "現状の傾向では、直近12ヶ月で資金ショートの兆候は強くありません。"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`${card} mt-4`}>
          <div className={cardHead}>月別 着地（予測）</div>
          <div className="px-5 pb-5 pt-3">
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-950">
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="px-3 py-2">month</th>
                    <th className="px-3 py-2 text-right">assumed net</th>
                    <th className="px-3 py-2 text-right">projected balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                  {months.map((m) => (
                    <tr key={m.month} className="text-neutral-200">
                      <td className="px-3 py-2">{m.month}</td>
                      <td className="px-3 py-2 text-right">
                        {new Intl.NumberFormat("ja-JP").format(m.assumedNet)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {new Intl.NumberFormat("ja-JP").format(
                          m.projectedBalance
                        )}
                      </td>
                    </tr>
                  ))}
                  {months.length === 0 && (
                    <tr>
                      <td
                        className="px-3 py-6 text-center text-neutral-500"
                        colSpan={3}
                      >
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 余白 */}
        <div className="h-10" />
      </div>
    </div>
  );
}