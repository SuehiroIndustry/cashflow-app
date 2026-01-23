// app/dashboard/_components/DashboardCashAlertCards.tsx
"use client";

import * as React from "react";

export type RiskLevel = "GREEN" | "YELLOW" | "RED";

export type DashboardCashAlertRow = {
  cash_account_id: number | string;
  cash_account_name: string;
  risk_level: RiskLevel;
  months_to_risk_label: string | null; // 例: "安全" | "今月" | "3ヶ月" など
  worst_month: string | Date | null; // 例: "2026-01-01T00:00:00" / "2026-01-01"
  worst_forecast_closing_balance: number | null;
  red_streak_label?: string | null; // 例: "2ヶ月連続" / null
};

type Props = {
  rows: DashboardCashAlertRow[];
  onOpenSimulation?: (cashAccountId: DashboardCashAlertRow["cash_account_id"]) => void;
  onOpenDetail?: (cashAccountId: DashboardCashAlertRow["cash_account_id"]) => void;
  primaryAction?: "simulation" | "detail";
  className?: string;
};

function formatJPY(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMonth(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})/);
    if (m) return `${m[1]}/${m[2]}`;
    return s;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}/${m}`;
}

function riskLabel(risk: RiskLevel): string {
  switch (risk) {
    case "RED":
      return "危険";
    case "YELLOW":
      return "注意";
    case "GREEN":
      return "安全";
    default:
      return "—";
  }
}

function riskBadgeClass(risk: RiskLevel): string {
  // Tailwind前提（色は好みで調整OK）
  switch (risk) {
    case "RED":
      return "bg-red-600 text-white";
    case "YELLOW":
      return "bg-amber-500 text-white";
    case "GREEN":
      return "bg-emerald-600 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

function sortByRisk(rows: DashboardCashAlertRow[]): DashboardCashAlertRow[] {
  const score = (r: RiskLevel) => (r === "RED" ? 1 : r === "YELLOW" ? 2 : 3);
  return [...rows].sort((a, b) => {
    const d = score(a.risk_level) - score(b.risk_level);
    if (d !== 0) return d;
    return String(a.cash_account_id).localeCompare(String(b.cash_account_id), "ja");
  });
}

export default function DashboardCashAlertCards({
  rows,
  onOpenSimulation,
  onOpenDetail,
  primaryAction = "simulation",
  className,
}: Props) {
  const sorted = React.useMemo(() => sortByRisk(rows), [rows]);

  return (
    <div
      className={[
        "grid gap-4",
        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        className ?? "",
      ].join(" ")}
    >
      {sorted.map((r) => {
        const worst = r.worst_forecast_closing_balance ?? null;
        const isZeroTouch = worst !== null && worst <= 0; // 0円到達も含む
        const monthLabel = formatMonth(r.worst_month);
        const monthsToRisk = r.months_to_risk_label ?? "—";
        const redStreak = r.red_streak_label ?? "—";

        const handlePrimary = () => {
          if (primaryAction === "simulation") onOpenSimulation?.(r.cash_account_id);
          else onOpenDetail?.(r.cash_account_id);
        };

        const primaryText = primaryAction === "simulation" ? "シミュレーションへ" : "内訳を見る";

        return (
          <div key={`${r.cash_account_id}`} className="rounded-2xl border bg-white shadow-sm">
            {/* Header */}
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{r.cash_account_name}</div>
                  <div className="text-xs text-muted-foreground">口座別の危険信号</div>
                </div>

                <span className={["shrink-0 rounded-full px-2 py-1 text-xs font-semibold", riskBadgeClass(r.risk_level)].join(" ")}>
                  {riskLabel(r.risk_level)}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">最悪残高</div>
                <div className="text-2xl font-semibold leading-none">{formatJPY(worst)}</div>
                <div className="text-xs text-muted-foreground">最悪月：{monthLabel}</div>

                {isZeroTouch && (
                  <div className="mt-2 inline-flex items-center rounded-lg border px-2 py-1 text-xs">
                    0円到達の可能性
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">リスクまで</div>
                  <div className="mt-1 text-sm font-medium">{monthsToRisk}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">赤字連続</div>
                  <div className="mt-1 text-sm font-medium">{redStreak}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onOpenDetail?.(r.cash_account_id)}
                >
                  内訳
                </button>
                <button
                  type="button"
                  className="rounded-xl px-3 py-2 text-sm text-white bg-black hover:opacity-90"
                  onClick={handlePrimary}
                >
                  {primaryText}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}