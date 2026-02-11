// app/dashboard/_components/OverviewCard.tsx
import React from "react";
import type { OverviewPayload } from "../_types";

type Props = {
  payload: OverviewPayload | null | undefined;
};

function yen(value: unknown): string {
  const n =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return n.toLocaleString("ja-JP") + " 円";
}

export default function OverviewCard({ payload }: Props) {
  // payload が {} / null / undefined でも落ちない
  const p = (payload ?? {}) as Partial<OverviewPayload>;

  const accountName = typeof p.accountName === "string" ? p.accountName : "-";
  const currentBalance = p.currentBalance;
  const thisMonthIncome = p.thisMonthIncome;
  const thisMonthExpense = p.thisMonthExpense;
  const net = typeof p.net === "number" && Number.isFinite(p.net) ? p.net : 0;

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <h3 className="px-5 pt-4 text-sm font-semibold text-white">Overview</h3>

      <div className="text-sm">
        現在残高: <span className="font-medium">{yen(currentBalance)}</span>
      </div>

      <div className="text-sm">今月の収入: {yen(thisMonthIncome)}</div>
      <div className="text-sm">今月の支出: {yen(thisMonthExpense)}</div>

      <div
        className={
          net >= 0
            ? "text-sm font-medium text-emerald-600"
            : "text-sm font-medium text-red-600"
        }
      >
        今月の収支: {yen(net)}
      </div>
    </div>
  );
}