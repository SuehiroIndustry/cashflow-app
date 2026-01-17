"use client";

import React from "react";
import type { MonthlyBalanceRow } from "./_actions/getMonthlyBalance";

export default function BalanceCard(props: {
  accountName: string;
  monthly: MonthlyBalanceRow[];
  yen: (n: number) => string;
}) {
  const { accountName, monthly, yen } = props;

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">Monthly Balances</div>
        <div className="text-xs text-gray-500">{accountName}</div>
      </div>

      {(!monthly || monthly.length === 0) ? (
        <div className="text-sm text-gray-500">No rows</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-1">month</th>
                <th className="py-1 text-right">income</th>
                <th className="py-1 text-right">expense</th>
                <th className="py-1 text-right">balance</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((r) => (
                <tr key={r.month} className="border-t">
                  <td className="py-1">{r.month}</td>
                  <td className="py-1 text-right">{yen(r.income ?? 0)}</td>
                  <td className="py-1 text-right">{yen(r.expense ?? 0)}</td>
                  <td className="py-1 text-right font-medium">{yen(r.balance ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}