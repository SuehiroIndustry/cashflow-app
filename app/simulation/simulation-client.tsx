"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { AccountRow } from "@/app/dashboard/_types";
import type { SimulationResult } from "./_actions/getSimulation";
import type { SimulationScenarioRow } from "./_actions/scenarios";
import { createSimulationScenario, deleteSimulationScenario } from "./_actions/scenarios";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null; // 0固定運用
  simulation: SimulationResult | null;
  scenarios: SimulationScenarioRow[];
};

function formatJPY(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP").format(Math.round(n)) + " 円";
}

function clampNumberString(v: string) {
  return v.replace(/[^\d]/g, "");
}

function toMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildFallbackMonths(count = 12) {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + 1);

  return Array.from({ length: count }).map((_, i) => {
    const d = new Date(base);
    d.setMonth(base.getMonth() + i);
    return { month: toMonthKey(d) };
  });
}

export default function SimulationClient({
  accounts,
  selectedAccountId,
  simulation,
  scenarios,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ✅ 全口座固定
  const selectedName = "全口座";

  const [assumedIncome, setAssumedIncome] = useState<string>(() =>
    simulation ? String(Math.round((simulation as any).avgIncome ?? 0)) : ""
  );
  const [assumedExpense, setAssumedExpense] = useState<string>(() =>
    simulation ? String(Math.round((simulation as any).avgExpense ?? 0)) : ""
  );

  const [scenarioName, setScenarioName] = useState<string>("");

  const assumedIncomeNum = useMemo(() => Number(assumedIncome || 0), [assumedIncome]);
  const assumedExpenseNum = useMemo(() => Number(assumedExpense || 0), [assumedExpense]);
  const assumedNet = useMemo(() => assumedIncomeNum - assumedExpenseNum, [assumedIncomeNum, assumedExpenseNum]);

  const months = useMemo(() => {
    if (!simulation) return [];

    const src =
      (simulation as any).months && Array.isArray((simulation as any).months)
        ? ((simulation as any).months as Array<{ month: string }>)
        : buildFallbackMonths(12);

    let running = Number((simulation as any).currentBalance ?? 0);
    return src.map((m) => {
      running += assumedNet;
      return {
        month: m.month,
        assumedNet: Math.round(assumedNet),
        projectedBalance: Math.round(running),
      };
    });
  }, [simulation, assumedNet]);

  const level = (simulation as any)?.level ?? "safe";
  const badge = useMemo(() => {
    if (level === "danger" || level === "short") {
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

  const pageBase = "min-h-screen bg-black text-white";
  const shell = "mx-auto w-full max-w-6xl px-4 py-6";

  const card = "rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm";
  const cardHead = "px-5 pt-4 text-sm font-semibold text-white";
  const cardBody = "px-5 pb-5 pt-3 text-sm text-neutral-200";
  const label = "text-xs text-neutral-400";
  const value = "text-base font-semibold text-white";

  const inputBase =
    "h-10 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";

  const buttonBase =
    "inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900 disabled:opacity-50 disabled:hover:bg-neutral-950";

  async function onSaveScenario() {
    const name = scenarioName.trim();
    if (!name) return;

    startTransition(async () => {
      try {
        await createSimulationScenario({
          name,
          assumedIncome: Number(assumedIncomeNum || 0),
          assumedExpense: Number(assumedExpenseNum || 0),
          horizonMonths: 12,
        });
        setScenarioName("");
        router.refresh(); // ✅ サーバー側のscenariosを取り直す
      } catch (e: any) {
        alert(e?.message ?? "保存に失敗しました");
      }
    });
  }

  function applyScenario(s: SimulationScenarioRow) {
    setAssumedIncome(String(Number(s.assumed_income ?? 0)));
    setAssumedExpense(String(Number(s.assumed_expense ?? 0)));
  }

  async function onDeleteScenario(id: number) {
    startTransition(async () => {
      try {
        await deleteSimulationScenario(id);
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "削除に失敗しました");
      }
    });
  }

  return (
    <div className={pageBase}>
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
             <h1 className="text-2xl font-bold tracking-tight text-white">Simulation</h1>
        </div>

          
        </div>

        {/* Selected */}
        <div className={`${card} mb-4`}>
          <div className={cardBody}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">
                  現在残高:{" "}
                  <span className="font-semibold text-white">
                    {formatJPY(Number((simulation as any)?.currentBalance ?? 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Average */}
          <div className={card}>
            <div className={cardHead}>平均（直近 6ヶ月）</div>
            <div className={cardBody}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={label}>収入</span>
                  <span className={value}>{formatJPY(Number((simulation as any)?.avgIncome ?? 0))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={label}>支出</span>
                  <span className={value}>{formatJPY(Number((simulation as any)?.avgExpense ?? 0))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={label}>差額</span>
                  <span className={value}>{formatJPY(Number((simulation as any)?.avgNet ?? 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inputs + Save */}
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
                    onChange={(e) => setAssumedIncome(clampNumberString(e.target.value))}
                    placeholder="例）1200000"
                  />
                </div>
                <div>
                  <div className={label}>想定 支出（月 / 月）</div>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    value={assumedExpense}
                    onChange={(e) => setAssumedExpense(clampNumberString(e.target.value))}
                    placeholder="例）900000"
                  />
                </div>

                <div className="pt-1 text-sm text-neutral-300">
                  想定差額： <span className="font-semibold text-white">{formatJPY(assumedNet)}</span>
                </div>

                {/* Save scenario */}
                <div className="pt-2 border-t border-neutral-800" />
                <div className="space-y-2">
                  <div className={label}>シナリオ名（保存）</div>
                  <div className="flex gap-2">
                    <input
                      className={inputBase}
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      placeholder="例）現実ライン / 楽観 / 悲観"
                    />
                    <button
                      className={buttonBase}
                      onClick={onSaveScenario}
                      disabled={isPending || !scenarioName.trim()}
                    >
                      保存
                    </button>
                  </div>
                  <div className="text-xs text-neutral-500">
                    ※保存すると、クリックで即時反映できます
                  </div>
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
                  {(simulation as any)?.message ??
                    "現状の想定では、直近12ヶ月で資金ショートの兆候は強くありません。"}
                </div>
              </div>

              {/* scenarios list */}
              <div className="mt-4 border-t border-neutral-800 pt-4">
                <div className="text-sm font-semibold text-white">保存済みシナリオ</div>
                <div className="mt-2 space-y-2">
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
                    >
                      <button
                        className="text-left text-sm text-white hover:underline"
                        onClick={() => applyScenario(s)}
                        title="クリックで反映"
                      >
                        {s.name}
                        <span className="ml-2 text-xs text-neutral-500">
                          （収入 {new Intl.NumberFormat("ja-JP").format(s.assumed_income)} / 支出{" "}
                          {new Intl.NumberFormat("ja-JP").format(s.assumed_expense)}）
                        </span>
                      </button>
                      <button
                        className="text-xs text-neutral-300 hover:text-white"
                        onClick={() => onDeleteScenario(s.id)}
                        disabled={isPending}
                        title="削除"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                  {scenarios.length === 0 && (
                    <div className="text-xs text-neutral-500">まだ保存されたシナリオがありません</div>
                  )}
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
                        {new Intl.NumberFormat("ja-JP").format(m.projectedBalance)}
                      </td>
                    </tr>
                  ))}
                  {months.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-neutral-500" colSpan={3}>
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}