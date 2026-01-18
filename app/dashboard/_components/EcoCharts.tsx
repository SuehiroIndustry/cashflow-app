"use client";

import React, { useMemo, useState } from "react";
import type { MonthlyCashBalanceRow } from "../_types";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Bar,
} from "recharts";

function toLabel(month: string) {
  // "2026-01-01" -> "2026-01"
  if (!month) return "";
  return month.slice(0, 7);
}

export default function EcoCharts(props: {
  accountName: string;
  monthly: MonthlyCashBalanceRow[];
  yen: (n: number) => string;
}) {
  const { accountName, monthly, yen } = props;
  const [range, setRange] = useState<6 | 12>(12);

  const rows = useMemo(() => {
    const sorted = [...(monthly ?? [])].sort((a, b) =>
      (a.month ?? "").localeCompare(b.month ?? "")
    );
    const sliced = sorted.slice(-range);

    return sliced.map((r) => ({
      month: toLabel(r.month),
      income: Number(r.income ?? 0),
      expense: Number(r.expense ?? 0),
      balance: Number(r.balance ?? 0),
    }));
  }, [monthly, range]);

  const hasData = rows.length > 0;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-white/70">Charts</div>
          <div className="text-xs text-white/50">{accountName}</div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            className={`rounded-md border px-2 py-1 ${
              range === 6 ? "border-white/40" : "border-white/10 text-white/60"
            }`}
            onClick={() => setRange(6)}
          >
            last 6 months
          </button>
          <button
            className={`rounded-md border px-2 py-1 ${
              range === 12 ? "border-white/40" : "border-white/10 text-white/60"
            }`}
            onClick={() => setRange(12)}
          >
            last 12 months
          </button>
        </div>
      </div>

      <div className="mt-3 h-[320px] w-full">
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-white/50">
            データなし
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${Math.round(Number(v))}`} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const n = Number(value ?? 0);
                  return [yen(n), name];
                }}
              />
              <Legend />
              <Bar dataKey="expense" name="Expense" />
              <Bar dataKey="income" name="Income" />
              <Line
                type="monotone"
                dataKey="balance"
                name="Balance"
                dot
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-2 text-xs text-white/40">
        ※ Income/Expense は月次、Balance は月末残高（想定）
      </div>
    </div>
  );
}