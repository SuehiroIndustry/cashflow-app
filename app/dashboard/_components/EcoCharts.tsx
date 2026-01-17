"use client";

import React from "react";
import type { MonthlyBalanceRow } from "./_actions/getMonthlyBalance";

export default function EcoCharts(props: {
  accountName: string;
  monthly: MonthlyBalanceRow[];
}) {
  const { accountName, monthly } = props;

  // 雛形：ここは後でRecharts等に置き換え前提
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Charts (stub)</div>
        <div className="text-xs text-gray-500">{accountName}</div>
      </div>

      <div className="text-sm text-gray-600">
        rows: {monthly?.length ?? 0}
      </div>

      <div className="text-xs text-gray-500">
        ※ ここは後で折れ線（balance）・棒（income/expense）に差し替え
      </div>
    </div>
  );
}