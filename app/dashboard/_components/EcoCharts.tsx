"use client";

import React, { useMemo } from "react";
import type { MonthlyBalanceRow } from "../_types";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

type Props = {
  accountName: string;
  monthly: MonthlyBalanceRow[];
  yen: (n: number) => string;
};

function toYYYYMM(s: string) {
  // month が '2026-01-01' などでも '2026-01' に寄せる
  if (!s) return "";
  return s.length >= 7 ? s.slice(0, 7) : s;
}

export default function EcoCharts({ accountName, monthly, yen }: Props) {
  const rows = useMemo(() => {
    // expense をマイナスにして「下に伸びる棒」にする
    return (monthly ?? []).map((r) => ({
      ...r,
      monthLabel: toYYYYMM(r.month),
      expenseNeg: -Math.abs(r.expense ?? 0),
    }));
  }, [monthly]);

  const hasData = rows.length > 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">Charts</div>
          <div className="text-xs text-gray-400">{accountName}</div>
        </div>
        <div className="text-xs text-gray-500">last {rows.length} months</div>
      </div>

      {!hasData ? (
        <div className="text-sm text-gray-400">データなし</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => yen(Number(v))}
                width={90}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const n = Number(value);
                  if (name === "Expense") return [yen(Math.abs(n)), name];
                  return [yen(n), name];
                }}
                labelFormatter={(label) => `${label}`}
              />
              <Legend />

              {/* 棒：Income / Expense（expense はマイナス棒） */}
              <Bar dataKey="income" name="Income" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenseNeg" name="Expense" radius={[0, 0, 6, 6]} />

              {/* 線：Balance */}
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="text-xs text-gray-500">
        ※ Income/Expense は月次、Balance は月末残高（想定）
      </div>
    </div>
  );
}