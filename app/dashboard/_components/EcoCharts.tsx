"use client";

import React, { useMemo } from "react";
import type { MonthlyBalanceRow } from "../_types";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

function diffColor(n: number, positiveGood = true) {
  if (n === 0) return "text-white";
  if (positiveGood) {
    return n > 0 ? "text-emerald-400" : "text-red-400";
  }
  return n < 0 ? "text-emerald-400" : "text-red-400";
}

export default function EcoCharts(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  const { latest, prev } = useMemo(() => {
    if (rows.length < 2) {
      return { latest: rows[rows.length - 1] ?? null, prev: null };
    }
    return {
      latest: rows[rows.length - 1],
      prev: rows[rows.length - 2],
    };
  }, [rows]);

  const diffIncome =
    latest && prev ? latest.income - prev.income : 0;

  const diffExpense =
    latest && prev ? latest.expense - prev.expense : 0;

  const diffBalance =
    latest && prev ? latest.balance - prev.balance : 0;

  return (
    <div className="space-y-4">
      {/* 前月比カード */}
      <div className="border border-white/15 bg-white/5 rounded p-4">
        <div className="font-semibold mb-3 text-white">
          推移（前月比）
        </div>

        {latest ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/70">対象月</div>
              <div className="font-semibold text-white">
                {latest.month}
              </div>
            </div>

            <div>
              <div className="text-white/70">収入</div>
              <div className="font-semibold text-white">
                {yen(latest.income)}
              </div>
              {prev && (
                <div className={diffColor(diffIncome)}>
                  {diffIncome >= 0 ? "▲ " : "▼ "}
                  {yen(Math.abs(diffIncome))}
                </div>
              )}
            </div>

            <div>
              <div className="text-white/70">支出</div>
              <div className="font-semibold text-white">
                {yen(latest.expense)}
              </div>
              {prev && (
                <div className={diffColor(diffExpense, false)}>
                  {diffExpense >= 0 ? "▲ " : "▼ "}
                  {yen(Math.abs(diffExpense))}
                </div>
              )}
            </div>

            <div>
              <div className="text-white/70">残高</div>
              <div className="font-semibold text-white">
                {yen(latest.balance)}
              </div>
              {prev && (
                <div className={diffColor(diffBalance)}>
                  {diffBalance >= 0 ? "▲ " : "▼ "}
                  {yen(Math.abs(diffBalance))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">No data</div>
        )}
      </div>

      {/* 月次一覧 */}
      <div className="border border-white/15 bg-white/5 rounded p-4">
        <div className="font-semibold mb-3 text-white">月次（一覧）</div>

        <div className="grid grid-cols-4 text-sm text-white/70 mb-2">
          <div>月</div>
          <div>収入</div>
          <div>支出</div>
          <div>残高</div>
        </div>

        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.month}
              className="grid grid-cols-4 text-sm items-center"
            >
              <div className="text-white/70">{r.month}</div>
              <div className="tabular-nums text-white">
                {yen(r.income)}
              </div>
              <div className="tabular-nums text-white/70">
                {yen(r.expense)}
              </div>
              <div className="tabular-nums font-semibold text-white">
                {yen(r.balance)}
              </div>
            </div>
          ))}

          {!rows.length && (
            <div className="text-sm text-white/60">No rows</div>
          )}
        </div>
      </div>
    </div>
  );
}