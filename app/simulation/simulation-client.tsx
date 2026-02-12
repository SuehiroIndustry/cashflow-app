"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AccountRow } from "@/app/dashboard/_types";
import type { SimulationResult } from "./_actions/getSimulation";
import type { SimulationScenarioRow } from "./_actions/scenarios";
import {
  createSimulationScenario,
  deleteSimulationScenario,
} from "./_actions/scenarios";

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

type JudgeLevel = "safe" | "warn" | "danger" | "short";

type Mode = "base" | "monthly";

type OverrideMap = Record<string, { income?: number; expense?: number }>;

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

  // ✅ 基準（入力欄）
  const [assumedIncome, setAssumedIncome] = useState<string>(() =>
    simulation ? String(Math.round((simulation as any).avgIncome ?? 0)) : ""
  );
  const [assumedExpense, setAssumedExpense] = useState<string>(() =>
    simulation ? String(Math.round((simulation as any).avgExpense ?? 0)) : ""
  );

  const [scenarioName, setScenarioName] = useState<string>("");

  // ✅ 入力モード切替
  const [mode, setMode] = useState<Mode>("base");

  // ✅ 月別上書き（空欄＝基準に戻す）
  const [overrides, setOverrides] = useState<OverrideMap>({});

  const assumedIncomeNum = useMemo(
    () => Number(assumedIncome || 0),
    [assumedIncome]
  );
  const assumedExpenseNum = useMemo(
    () => Number(assumedExpense || 0),
    [assumedExpense]
  );

  const baseNet = useMemo(
    () => assumedIncomeNum - assumedExpenseNum,
    [assumedIncomeNum, assumedExpenseNum]
  );

  const monthsSrc = useMemo(() => {
    if (!simulation) return [];
    const src =
      (simulation as any).months && Array.isArray((simulation as any).months)
        ? ((simulation as any).months as Array<{ month: string }>)
        : buildFallbackMonths(12);
    return src;
  }, [simulation]);

  // ✅ その月の income/expense を決定（monthlyは上書き優先、空欄は基準）
  const getMonthIncome = (month: string) => {
    if (mode !== "monthly") return assumedIncomeNum;
    const o = overrides[month];
    return Number.isFinite(o?.income as any) ? Number(o!.income) : assumedIncomeNum;
  };
  const getMonthExpense = (month: string) => {
    if (mode !== "monthly") return assumedExpenseNum;
    const o = overrides[month];
    return Number.isFinite(o?.expense as any) ? Number(o!.expense) : assumedExpenseNum;
  };

  // ✅ テーブル表示用（net / projected balance を月別計算）
  const months = useMemo(() => {
    if (!simulation) return [];

    let running = Number((simulation as any).currentBalance ?? 0);

    return monthsSrc.map((m) => {
      const income = getMonthIncome(m.month);
      const expense = getMonthExpense(m.month);
      const net = Math.round(income - expense);

      running += net;

      return {
        month: m.month,
        income: Math.round(income),
        expense: Math.round(expense),
        net,
        projectedBalance: Math.round(running),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation, monthsSrc, mode, overrides, assumedIncomeNum, assumedExpenseNum]);

  // ✅ 判定：月別テーブルの推移から判定（どこかでマイナスになったらCRITICAL）
  const judge = useMemo(() => {
    const currentBalance = Number((simulation as any)?.currentBalance ?? 0);

    const projectedMin = months.reduce(
      (min, r) => Math.min(min, Number(r.projectedBalance)),
      Number.POSITIVE_INFINITY
    );

    let level: JudgeLevel = "safe";
    let message =
      "現状の想定では、直近12ヶ月で資金ショートの兆候は強くありません。";

    if (months.length > 0 && projectedMin < 0) {
      level = "short";
      message =
        "このままの想定だと、12ヶ月以内に資金ショートする可能性が高いです。";
    } else if (currentBalance < 300_000 || (mode === "base" ? baseNet < 0 : months.some((r) => r.net < 0))) {
      level = "warn";
      message =
        "残高が薄いか、想定収支がマイナス寄りの月があります。固定費・季節要因を点検してください。";
    }

    return { level, message };
  }, [simulation, months, mode, baseNet]);

  const badge = useMemo(() => {
    if (judge.level === "short") {
      return {
        label: "CRITICAL",
        className:
          "inline-flex items-center rounded-full border border-red-800 bg-red-950 px-2.5 py-1 text-xs font-semibold text-red-200",
      };
    }
    if (judge.level === "warn") {
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
  }, [judge.level]);

  const pageBase = "min-h-screen bg-black text-white";
  const shell = "mx-auto w-full max-w-6xl px-4 py-6";

  const card = "rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm";
  const cardHead = "px-5 pt-4 text-sm font-semibold text-white";
  const cardBody = "px-5 pb-5 pt-3 text-sm text-neutral-200";
  const label = "text-xs text-neutral-400";
  const value = "text-base font-semibold text-white";

  const inputBase =
    "h-10 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";

  const inputMini =
    "h-8 w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";

  const buttonBase =
    "inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900 disabled:opacity-50 disabled:hover:bg-neutral-950";

  const tabBtn = (active: boolean) =>
    [
      "inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs",
      active
        ? "border-neutral-600 bg-neutral-900 text-white"
        : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900",
    ].join(" ");

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
        router.refresh();
      } catch (e: any) {
        alert(e?.message ?? "保存に失敗しました");
      }
    });
  }

  function applyScenario(s: SimulationScenarioRow) {
    setAssumedIncome(String(Number(s.assumed_income ?? 0)));
    setAssumedExpense(String(Number(s.assumed_expense ?? 0)));
    // シナリオ反映は基準入力を更新するだけ（上書きは保持 or 使わない）
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

  function setMonthOverride(
    month: string,
    key: "income" | "expense",
    raw: string
  ) {
    const cleaned = clampNumberString(raw);

    // 空欄＝上書きを解除（基準に戻す）
    if (!cleaned) {
      setOverrides((prev) => {
        const next = { ...prev };
        const cur = next[month] ?? {};
        const { [key]: _drop, ...rest } = cur as any;

        if (Object.keys(rest).length === 0) {
          delete next[month];
        } else {
          next[month] = rest as any;
        }
        return next;
      });
      return;
    }

    const n = Number(cleaned);

    setOverrides((prev) => ({
      ...prev,
      [month]: {
        ...(prev[month] ?? {}),
        [key]: n,
      },
    }));
  }

  function clearOverrides() {
    setOverrides({});
  }

  return (
    <div className={pageBase}>
      <div className={shell}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Simulation
            </h1>
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
              <div className="text-xs text-neutral-500">{selectedName}</div>
            </div>
          </div>
        </div>

        {/* 3 columns */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* LEFT: Average + Scenarios */}
          <div className="space-y-4">
            {/* Average */}
            <div className={card}>
              <div className={cardHead}>平均（直近 6ヶ月）</div>
              <div className={cardBody}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={label}>収入</span>
                    <span className={value}>
                      {formatJPY(Number((simulation as any)?.avgIncome ?? 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={label}>支出</span>
                    <span className={value}>
                      {formatJPY(Number((simulation as any)?.avgExpense ?? 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={label}>差額</span>
                    <span className={value}>
                      {formatJPY(Number((simulation as any)?.avgNet ?? 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios */}
            <div className={card}>
              <div className={cardHead}>保存済みシナリオ</div>
              <div className={cardBody}>
                <div className="space-y-2">
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
                          （収入{" "}
                          {new Intl.NumberFormat("ja-JP").format(s.assumed_income)}{" "}
                          / 支出{" "}
                          {new Intl.NumberFormat("ja-JP").format(s.assumed_expense)}
                          ）
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
                    <div className="text-xs text-neutral-500">
                      まだ保存されたシナリオがありません
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE: Inputs + Save */}
          <div className={card}>
            <div className={cardHead}>
              <div className="flex items-center justify-between gap-2">
                <span>予測（12ヶ月）</span>

                {/* mode switch */}
                <div className="flex gap-2">
                  <button
                    className={tabBtn(mode === "base")}
                    onClick={() => setMode("base")}
                    type="button"
                  >
                    基準入力
                  </button>
                  <button
                    className={tabBtn(mode === "monthly")}
                    onClick={() => setMode("monthly")}
                    type="button"
                  >
                    月別上書き
                  </button>
                </div>
              </div>
            </div>

            <div className={cardBody}>
              <div className="space-y-3">
                <div>
                  <div className={label}>想定 収入（基準：月 / 月）</div>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    value={assumedIncome}
                    onChange={(e) =>
                      setAssumedIncome(clampNumberString(e.target.value))
                    }
                    placeholder="例）1200000"
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    ※「基準入力」モードで有効（「月別上書き」では基準として使われます）
                  </div>
                </div>

                <div>
                  <div className={label}>想定 支出（基準：月 / 月）</div>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    value={assumedExpense}
                    onChange={(e) =>
                      setAssumedExpense(clampNumberString(e.target.value))
                    }
                    placeholder="例）900000"
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    ※「基準入力」モードで有効（「月別上書き」では基準として使われます）
                  </div>
                </div>

                <div className="pt-1 text-sm text-neutral-300">
                  想定差額（基準）：{" "}
                  <span className="font-semibold text-white">
                    {formatJPY(baseNet)}
                  </span>
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
                    ※保存は「基準の収入/支出」のみ（上書きは保存しません）
                  </div>

                  <div className="pt-2">
                    <button
                      className={buttonBase}
                      onClick={clearOverrides}
                      disabled={mode !== "monthly" || Object.keys(overrides).length === 0}
                      type="button"
                    >
                      月別の上書きを解除
                    </button>
                    <div className="mt-1 text-xs text-neutral-500">
                      ※空欄にすると、その月の上書きだけ解除（基準に戻る）
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Judge + Logic */}
          <div className={card}>
            <div className={cardHead}>判定</div>
            <div className={cardBody}>
              <div className="flex items-start gap-3">
                <span className={badge.className}>{badge.label}</span>
                <div className="text-sm text-neutral-200">{judge.message}</div>
              </div>

              <div className="mt-4 border-t border-neutral-800 pt-3 text-xs text-neutral-500 leading-relaxed">
                <div className="font-semibold text-white mb-1">判定ロジック</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <span className="text-red-400 font-semibold">CRITICAL</span>：
                    12ヶ月のどこかで推定残高がマイナス
                  </li>
                  <li>
                    <span className="text-yellow-400 font-semibold">CAUTION</span>：
                    残高30万円未満 または 収支がマイナスの月がある
                  </li>
                  <li>
                    <span className="text-emerald-400 font-semibold">SAFE</span>：
                    上記に該当しない場合
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`${card} mt-4`}>
          <div className="flex items-baseline justify-between">
  <h2 className="text-lg font-semibold">月別 着地（予測）</h2>
  <span className="text-xs text-gray-400">
    ※空欄＝基準に戻す（0ではありません）
  </span>
</div>
          <div className="px-5 pb-5 pt-3">
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-950">
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="px-3 py-2">month</th>
                    <th className="px-3 py-2">income（月別）</th>
                    <th className="px-3 py-2">expense（月別）</th>
                    <th className="px-3 py-2 text-right">net</th>
                    <th className="px-3 py-2 text-right">projected balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                  {months.map((m) => {
                    const o = overrides[m.month];
                    const incomeStr =
                      mode === "monthly"
                        ? (o?.income ?? "").toString()
                        : String(m.income);
                    const expenseStr =
                      mode === "monthly"
                        ? (o?.expense ?? "").toString()
                        : String(m.expense);

                    return (
                      <tr key={m.month} className="text-neutral-200">
                        <td className="px-3 py-2">{m.month}</td>

                        <td className="px-3 py-2">
                          <input
                            className={inputMini}
                            inputMode="numeric"
                            disabled={mode !== "monthly"}
                            value={mode === "monthly" ? incomeStr : String(m.income)}
                            placeholder={new Intl.NumberFormat("ja-JP").format(
                              assumedIncomeNum
                            )}
                            onChange={(e) =>
                              setMonthOverride(m.month, "income", e.target.value)
                            }
                            title={
                              mode === "monthly"
                                ? `空欄で基準に戻る（基準: ${new Intl.NumberFormat("ja-JP").format(
                                    assumedIncomeNum
                                  )}）`
                                : "月別上書きモードで編集できます"
                            }
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            className={inputMini}
                            inputMode="numeric"
                            disabled={mode !== "monthly"}
                            value={mode === "monthly" ? expenseStr : String(m.expense)}
                            placeholder={new Intl.NumberFormat("ja-JP").format(
                              assumedExpenseNum
                            )}
                            onChange={(e) =>
                              setMonthOverride(m.month, "expense", e.target.value)
                            }
                            title={
                              mode === "monthly"
                                ? `空欄で基準に戻る（基準: ${new Intl.NumberFormat("ja-JP").format(
                                    assumedExpenseNum
                                  )}）`
                                : "月別上書きモードで編集できます"
                            }
                          />
                        </td>

                        <td className="px-3 py-2 text-right">
                          {new Intl.NumberFormat("ja-JP").format(m.net)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {new Intl.NumberFormat("ja-JP").format(m.projectedBalance)}
                        </td>
                      </tr>
                    );
                  })}

                  {months.length === 0 && (
                    <tr>
                      <td
                        className="px-3 py-6 text-center text-neutral-500"
                        colSpan={5}
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

        <div className="h-10" />
      </div>
    </div>
  );
}