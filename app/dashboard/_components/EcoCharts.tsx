// app/dashboard/_components/EcoCharts.tsx
"use client";

import React, { useMemo } from "react";
import type { MonthlyBalanceRow } from "../_types";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function EcoCharts(props: { rows: MonthlyBalanceRow[] }) {
  const { rows } = props;

  const latest = useMemo(() => {
    if (!rows.length) return null;
    return rows[rows.length - 1];
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="border border-white/15 bg-white/5 rounded p-4">
        <div className="font-semibold mb-2 text-white">推移（サマリ）</div>
        {latest ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/70">最新月</div>
              <div className="font-semibold text-white">{latest.month}</div>
            </div>
            <div>
              <div className="text-white/70">収入</div>
              <div className="font-semibold text-white">{yen(latest.income)}</div>
            </div>
            <div>
              <div className="text-white/70">支出</div>
              <div className="font-semibold text-white">{yen(latest.expense)}</div>
            </div>
            <div>
              <div className="text-white/70">残高</div>
              <div className="font-semibold text-white">{yen(latest.balance)}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-white/60">No data</div>
        )}
      </div>

      {/* 月次（一覧） */}
      <div className="border border-white/15 bg-white/5 rounded p-4">
        <div className="font-semibold mb-3 text-white">月次（一覧）</div>

        {/* Header（推移（前月比）っぽく、列見出しを先に置く） */}
        <div className="grid grid-cols-5 gap-4 text-xs text-white/70 pb-2 border-b border-white/10">
          <div>月</div>
          <div className="text-right">収入</div>
          <div className="text-right">支出</div>
          <div className="text-right">収支</div>
          <div className="text-right">残高</div>
        </div>

        <div className="space-y-2 pt-3">
          {rows.map((r) => {
            const net = (r.income ?? 0) - (r.expense ?? 0);
            const netPos = net >= 0;
            const balNeg = r.balance < 0;

            return (
              <div
                key={r.month}
                className="grid grid-cols-5 gap-4 items-center text-sm"
              >
                <div className="text-white/70">{r.month}</div>

                <div className="text-right tabular-nums font-semibold text-white">
                  {yen(r.income)}
                </div>

                <div className="text-right tabular-nums font-semibold text-white">
                  {yen(r.expense)}
                </div>

                {/* ✅ 追加：収支（支出と残高の間） */}
                <div
                  className={
                    netPos
                      ? "text-right tabular-nums font-semibold text-emerald-400"
                      : "text-right tabular-nums font-semibold text-red-400"
                  }
                >
                  {yen(net)}
                </div>

                <div
                  className={
                    balNeg
                      ? "text-right tabular-nums font-semibold text-red-400"
                      : "text-right tabular-nums font-semibold text-white"
                  }
                >
                  {yen(r.balance)}
                </div>
              </div>
            );
          })}

          {!rows.length && <div className="text-sm text-white/60">No rows</div>}
        </div>
      </div>
    </div>
  );
}