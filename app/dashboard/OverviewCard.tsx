"use client";

import React from "react";

type Overview = {
  current_balance: number;
  month_income: number;
  month_expense: number;
  net_month: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  net_planned_30d: number;
  projected_balance: number;
  risk_level: string;
  risk_score: number;
  computed_at: string | null;
};

function yen(n: number) {
  const v = Math.trunc(n);
  return new Intl.NumberFormat("ja-JP").format(v);
}

function signYen(n: number) {
  const v = Math.trunc(n);
  const s = v >= 0 ? "+" : "-";
  return `${s}¥${yen(Math.abs(v))}`;
}

function riskLabel(level: string) {
  const u = (level ?? "").toUpperCase();
  if (u === "RED") return { text: "危険", hint: "このままだと資金ショートが現実的", cls: "border-red-500 text-red-400" };
  if (u === "YELLOW") return { text: "注意", hint: "資金繰りに余裕がない可能性", cls: "border-yellow-500 text-yellow-300" };
  return { text: "安定", hint: "当面は致命傷になりにくい", cls: "border-green-500 text-green-300" };
}

export function OverviewCard({ data, emptyMessage }: { data: Overview | null; emptyMessage?: string }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-white/15 p-4 text-white/70">
        <div className="text-sm">{emptyMessage ?? "データがありません"}</div>
      </div>
    );
  }

  const risk = riskLabel(data.risk_level);

  return (
    <div className="rounded-lg border border-white/15 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-white/70">現在残高</div>
          <div className="mt-1 text-3xl font-bold">¥{yen(data.current_balance)}</div>
        </div>

        <div className={`rounded-full border px-3 py-1 text-sm ${risk.cls}`}>
          {risk.text}（score: {data.risk_score ?? 0}）
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 p-3">
          <div className="text-xs text-white/60">今月の収支（入 − 出）</div>
          <div className="mt-1 text-xl font-semibold">{signYen(data.net_month)}</div>
          <div className="mt-1 text-xs text-white/50">
            入: ¥{yen(data.month_income)} / 出: ¥{yen(data.month_expense)}
          </div>
        </div>

        <div className="rounded-md border border-white/10 p-3">
          <div className="text-xs text-white/60">30日後の予測残高</div>
          <div className="mt-1 text-xl font-semibold">¥{yen(data.projected_balance)}</div>
          <div className="mt-1 text-xs text-white/50">
            予定収支: {signYen(data.net_planned_30d)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-sm text-white/70">
        リスク所見：{risk.hint}
      </div>

      <div className="mt-2 text-xs text-white/45">
        更新: {data.computed_at ? new Date(data.computed_at).toLocaleString("ja-JP") : "—"}
      </div>
    </div>
  );
}