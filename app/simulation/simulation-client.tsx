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
type InputMode = "base" | "monthly";

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

  // ✅ 入力モード：基準 or 月別上書き（A方式：どちらか一方だけ有効）
  const [inputMode, setInputMode] = useState<InputMode>("base");

  const [assumedIncome, setAssumedIncome] = useState<string>(() =>
    simulation ? String(Math.round((simulation as any).avgIncome ?? 0)) : ""
  );
  const [assumedExpense, setAssumedExpense] = useState<string>(() =>
    simulation ? String(Math.round((simulation as any).avgExpense ?? 0)) : ""
  );

  // ✅ 未来12ヶ月の「月別 収入/支出 上書き」(YYYY-MM -> 数字文字列)
  const [incomeOverrides, setIncomeOverrides] = useState<Record<string, string>>(
    {}
  );
  const [expenseOverrides, setExpenseOverrides] = useState<Record<string, string>>(
    {}
  );

  const [scenarioName, setScenarioName] = useState<string>("");

  const assumedIncomeNum = useMemo(
    () => Number(assumedIncome || 0),
    [assumedIncome]
  );
  const assumedExpenseNum = useMemo(
    () => Number(assumedExpense || 0),
    [assumedExpense]
  );

  const assumedNetAvg = useMemo(
    () => assumedIncomeNum - assumedExpenseNum,
    [assumedIncomeNum, assumedExpenseNum]
  );

  // 未来月一覧（YYYY-MM）
  const monthKeys = useMemo(() => {
    if (!simulation) return [];
    const src =
      (simulation as any).months && Array.isArray((simulation as any).months)
        ? ((simulation as any).months as Array<{ month: string }>)
        : buildFallbackMonths(12);
    return src.map((m) => m.month);
  }, [simulation]);

  // ✅ 月別に「収入」を決める（モードで分岐）
  const getIncomeForMonth = (month: string) => {
    // baseモード：月別上書きは無視
    if (inputMode === "base") return assumedIncomeNum;

    // monthlyモード：overrideがあればそれ、なければ基準
    const raw = incomeOverrides[month];
    if (!raw) return assumedIncomeNum;
    const n = Number(raw || 0);
    return Number.isFinite(n) ? n : assumedIncomeNum;
  };

  // ✅ 月別に「支出」を決める（モードで分岐）
  const getExpenseForMonth = (month: string) => {
    if (inputMode === "base") return assumedExpenseNum;

    const raw = expenseOverrides[month];
    if (!raw) return assumedExpenseNum;
    const n = Number(raw || 0);
    return Number.isFinite(n) ? n : assumedExpenseNum;
  };

  // ✅ 月別の予測（モードを反映）
  const months = useMemo(() => {
    if (!simulation) return [];

    const src =
      (simulation as any).months && Array.isArray((simulation as any).months)
        ? ((simulation as any).months as Array<{ month: string }>)
        : buildFallbackMonths(12);

    let running = Number((simulation as any).currentBalance ?? 0);

    return src.map((m) => {
      const income = getIncomeForMonth(m.month);
      const expense = getExpenseForMonth(m.month);
      const net = income - expense;
      running += net;

      return {
        month: m.month,
        assumedIncome: Math.round(income),
        assumedExpense: Math.round(expense),
        assumedNet: Math.round(net),
        projectedBalance: Math.round(running),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    simulation,
    inputMode,
    assumedIncomeNum,
    assumedExpenseNum,
    incomeOverrides,
    expenseOverrides,
  ]);

  // ✅ 判定も「months（=モード反映済み）」から作る
  const judge = useMemo(() => {
    const currentBalance = Number((simulation as any)?.currentBalance ?? 0);

    const minBalance = months.reduce((min, m) => {
      return Math.min(min, Number(m.projectedBalance ?? 0));
    }, Number.POSITIVE_INFINITY);

    const avgNet =
      months.length === 0
        ? 0
        : months.reduce((s, m) => s + Number(m.assumedNet ?? 0), 0) / months.length;

    let level: JudgeLevel = "safe";
    let message =
      "現状の想定では、直近12ヶ月で資金ショートの兆候は強くありません。";

    if (months.length > 0 && minBalance < 0) {
      level = "short";
      message =
        "このままの想定（入力した収入/支出）だと、12ヶ月以内に資金ショートする可能性が高いです。";
    } else if (currentBalance < 300_000 || avgNet < 0) {
      level = "warn";
      message =
        "残高が薄いか、想定収支がマイナス寄りです。収入の季節要因・入金タイミングと支出の固定費を点検してください。";
    }

    return { level, message };
  }, [simulation, months]);

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

  const inputDisabled =
    "opacity-50 cursor-not-allowed";

  const buttonBase =
    "inline-flex h-9 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white hover:bg-neutral-900 disabled:opacity-50 disabled:hover:bg-neutral-950";

  const tableInput =
    "h-8 w-28 rounded-md border border-neutral-800 bg-neutral-900 px-2 text-right text-sm text-white placeholder:text-neutral-600 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";

  const tabBtn =
    "inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm";
  const tabOn =
    "border-neutral-600 bg-neutral-900 text-white";
  const tabOff =
    "border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-900 hover:text-white";

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

    // ✅ 混在事故を防ぐ：シナリオ適用時は月別上書きをクリア
    setIncomeOverrides({});
    setExpenseOverrides({});
    setInputMode("base");
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

  const onChangeIncomeOverride = (month: string, v: string) => {
    const cleaned = clampNumberString(v);
    setIncomeOverrides((prev) => {
      if (!cleaned) {
        const { [month]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [month]: cleaned };
    });
  };

  const onChangeExpenseOverride = (month: string, v: string) => {
    const cleaned = clampNumberString(v);
    setExpenseOverrides((prev) => {
      if (!cleaned) {
        const { [month]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [month]: cleaned };
    });
  };

  const clearOverrides = () => {
    setIncomeOverrides({});
    setExpenseOverrides({});
  };

  const hasAnyOverrides =
    Object.keys(incomeOverrides).length > 0 || Object.keys(expenseOverrides).length > 0;

  const switchToBase = () => {
    setInputMode("base");
    // ✅ 上書き値は保持してOK（ただし計算には使わない）。混乱が嫌なら解除ボタンで消せる
  };

  const switchToMonthly = () => {
    setInputMode("monthly");
  };

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
            <div className={cardHead}>予測（12ヶ月）</div>
            <div className={cardBody}>
              {/* ✅ 入力モード切替（A方式） */}
              <div className="mb-3 flex items-center gap-2">
                <button
                  className={`${tabBtn} ${inputMode === "base" ? tabOn : tabOff}`}
                  onClick={switchToBase}
                  type="button"
                  title="基準（月次一定）で計算"
                >
                  基準入力
                </button>
                <button
                  className={`${tabBtn} ${inputMode === "monthly" ? tabOn : tabOff}`}
                  onClick={switchToMonthly}
                  type="button"
                  title="月別上書きで計算"
                >
                  月別上書き
                </button>
              </div>

              {inputMode === "base" && hasAnyOverrides && (
                <div className="mb-3 rounded-md border border-yellow-900/40 bg-yellow-950/30 px-3 py-2 text-xs text-yellow-200/90">
                  月別の上書き値が入っていますが、現在は <b>基準入力モード</b> のため計算には使っていません。
                  必要なら「月別上書き」に切り替えるか、下のボタンで解除してください。
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className={label}>想定 収入（基準：月 / 月）</div>
                  <input
                    className={`${inputBase} ${inputMode === "monthly" ? inputDisabled : ""}`}
                    inputMode="numeric"
                    value={assumedIncome}
                    onChange={(e) =>
                      setAssumedIncome(clampNumberString(e.target.value))
                    }
                    placeholder="例）1200000"
                    disabled={inputMode === "monthly"}
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    ※「基準入力」モードで有効（「月別上書き」ではロック）
                  </div>
                </div>

                <div>
                  <div className={label}>想定 支出（基準：月 / 月）</div>
                  <input
                    className={`${inputBase} ${inputMode === "monthly" ? inputDisabled : ""}`}
                    inputMode="numeric"
                    value={assumedExpense}
                    onChange={(e) =>
                      setAssumedExpense(clampNumberString(e.target.value))
                    }
                    placeholder="例）900000"
                    disabled={inputMode === "monthly"}
                  />
                  <div className="mt-1 text-xs text-neutral-500">
                    ※「基準入力」モードで有効（「月別上書き」ではロック）
                  </div>
                </div>

                <div className="pt-1 text-sm text-neutral-300">
                  想定差額（基準）：{" "}
                  <span className="font-semibold text-white">
                    {formatJPY(assumedNetAvg)}
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
                    ※保存は「基準の収入/支出」のみ（※月別上書きは保存しない）
                  </div>

                  <div className="pt-2">
                    <button
                      className={buttonBase}
                      onClick={clearOverrides}
                      disabled={!hasAnyOverrides}
                      title="月別の収入/支出上書きをすべて解除"
                    >
                      月別の上書きを解除
                    </button>
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
                    残高30万円未満 または 12ヶ月平均の想定収支がマイナス
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
          <div className={cardHead}>月別 着地（予測）</div>
          <div className="px-5 pb-5 pt-3">
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-950">
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="px-3 py-2">month</th>
                    <th className="px-3 py-2 text-right">income（月別）</th>
                    <th className="px-3 py-2 text-right">expense（月別）</th>
                    <th className="px-3 py-2 text-right">net</th>
                    <th className="px-3 py-2 text-right">projected balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                  {months.map((m) => (
                    <tr key={m.month} className="text-neutral-200">
                      <td className="px-3 py-2">{m.month}</td>

                      <td className="px-3 py-2 text-right">
                        <input
                          className={`${tableInput} ${inputMode === "base" ? inputDisabled : ""}`}
                          inputMode="numeric"
                          value={incomeOverrides[m.month] ?? ""}
                          onChange={(e) =>
                            onChangeIncomeOverride(m.month, e.target.value)
                          }
                          placeholder={String(m.assumedIncome)}
                          title={
                            inputMode === "base"
                              ? "基準入力モードでは月別上書きは無効です"
                              : "空欄に戻すと基準収入に戻ります"
                          }
                          disabled={inputMode === "base"}
                        />
                      </td>

                      <td className="px-3 py-2 text-right">
                        <input
                          className={`${tableInput} ${inputMode === "base" ? inputDisabled : ""}`}
                          inputMode="numeric"
                          value={expenseOverrides[m.month] ?? ""}
                          onChange={(e) =>
                            onChangeExpenseOverride(m.month, e.target.value)
                          }
                          placeholder={String(m.assumedExpense)}
                          title={
                            inputMode === "base"
                              ? "基準入力モードでは月別上書きは無効です"
                              : "空欄に戻すと基準支出に戻ります"
                          }
                          disabled={inputMode === "base"}
                        />
                      </td>

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
                        colSpan={5}
                      >
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-neutral-500">
              ※「基準入力」モードでは月別入力は無効です。「月別上書き」モードに切り替えると、その月だけ上書きできます（空欄に戻すと基準に戻る）。
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}