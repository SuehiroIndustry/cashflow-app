// app/dashboard/_components/OverviewCard.tsx
import React from "react";
import type { OverviewPayload } from "../_types";

type Props = {
  payload: OverviewPayload | null | undefined;
};

function yen(value: unknown): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return n.toLocaleString("ja-JP") + " 円";
}

export default function OverviewCard({ payload }: Props) {
  // payload が {} / null / undefined でも落ちない
  const p = (payload ?? {}) as Partial<OverviewPayload>;

  const currentBalance = p.currentBalance;
  const thisMonthIncome = p.thisMonthIncome;
  const thisMonthExpense = p.thisMonthExpense;

  // ✅ net は getOverview 側で number 化されてる想定だが、保険だけかける
  const netRaw = p.net;
  const net = typeof netRaw === "number" && Number.isFinite(netRaw) ? netRaw : 0;

  const netClass =
  net > 0
    ? "text-lg font-bold text-emerald-500"
    : net < 0
    ? "text-lg font-bold text-red-500"
    : "text-lg font-bold text-white";

  return (
    <div className="rounded-xl border p-4 space-y-2">
      <div className="font-semibold mb-2">今月の概要</div>

      <div className="text-sm">
        現在残高: <span className="font-medium">{yen(currentBalance)}</span>
      </div>

      <div className="text-sm">今月の収入: {yen(thisMonthIncome)}</div>
      <div className="text-sm">今月の支出: {yen(thisMonthExpense)}</div>

      <div className={netClass}>今月の収支: {yen(net)}</div>
    </div>
  );
}