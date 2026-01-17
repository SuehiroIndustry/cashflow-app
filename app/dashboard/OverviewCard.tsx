"use client";

import React from "react";
import type { OverviewPayload } from "./DashboardClient";

export default function OverviewCard(props: {
  accountName: string;
  overview: OverviewPayload;
  yen: (n: number) => string;
}) {
  const { accountName, overview, yen } = props;

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Overview</div>
        <div className="text-xs text-gray-500">{accountName}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-600">Current Balance</div>
        <div className="text-right font-medium">{yen(overview.current_balance ?? 0)}</div>

        <div className="text-gray-600">This Month Income</div>
        <div className="text-right">{yen(overview.month_income ?? 0)}</div>

        <div className="text-gray-600">This Month Expense</div>
        <div className="text-right">{yen(overview.month_expense ?? 0)}</div>

        <div className="text-gray-600">Net</div>
        <div className="text-right font-medium">{yen(overview.net_month ?? 0)}</div>
      </div>

      <div className="pt-2 border-t text-xs text-gray-600 flex items-center justify-between">
        <div>
          Risk: <span className="font-semibold">{overview.risk_level ?? "UNKNOWN"}</span>
          {" "}
          (score: {overview.risk_score ?? 0})
        </div>
        <div className="text-gray-400">
          {overview.computed_at ? new Date(overview.computed_at).toLocaleString("ja-JP") : ""}
        </div>
      </div>
    </div>
  );
}