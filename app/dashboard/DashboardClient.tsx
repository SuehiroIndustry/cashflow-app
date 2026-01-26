// app/dashboard/DashboardClient.tsx
"use client";

import React from "react";
import Link from "next/link";

type CashStatus = "ok" | "warning" | "danger";

export type DashboardCashStatus = {
  status: CashStatus;
  monitored_accounts: number;
  warning_count: number;
  danger_count: number;
  first_alert_month: string | null;
  worst_balance: number | null;
};

export type DashboardCashAlertCard = {
  cash_account_id: number;
  account_name: string;
  first_alert_month: string;
  projected_ending_balance: number;
  alert_level: "warning" | "danger";
};

function getCashStatusLabel(status: CashStatus) {
  switch (status) {
    case "danger":
      return {
        badge: "危険",
        message: "このままだと資金が尽きます。今すぐ手を打ちましょう。",
      };
    case "warning":
      return {
        badge: "注意",
        message: "このままだと資金余力が細ります。先手で整えましょう。",
      };
    default:
      return { badge: "問題なし", message: "" };
  }
}

function formatJPY(value: number) {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `¥${Math.round(value).toLocaleString("ja-JP")}`;
  }
}

function monthLabel(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}年${m}月`;
}

function levelLabel(level: "warning" | "danger") {
  return level === "danger" ? "危険" : "注意";
}

export default function DashboardClient(props: {
  cashStatus: DashboardCashStatus;
  alertCards: DashboardCashAlertCard[];
  children?: React.ReactNode;
}) {
  const { cashStatus, alertCards, children } = props;

  const showAlerts = cashStatus.status !== "ok";
  const msg = getCashStatusLabel(cashStatus.status);

  return (
    <div className="space-y-6 text-neutral-100">
      {/* warning/danger のときだけ表示 */}
      {showAlerts && (
        <section className="rounded-lg border border-neutral-700 bg-neutral-950 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded border border-neutral-600 px-2 py-0.5 text-sm font-semibold text-neutral-100">
                  {msg.badge}
                </span>
                <span className="text-sm text-neutral-300">
                  監視口座：{cashStatus.monitored_accounts} / 注意：
                  {cashStatus.warning_count} / 危険：{cashStatus.danger_count}
                </span>
              </div>

              <p className="mt-2 text-sm text-neutral-200">{msg.message}</p>

              {cashStatus.first_alert_month && (
                <p className="mt-1 text-sm text-neutral-300">
                  最初の警告：{monthLabel(cashStatus.first_alert_month)}
                  {cashStatus.worst_balance != null && (
                    <> / 最悪残高：{formatJPY(cashStatus.worst_balance)}</>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/simulation"
                className="inline-flex items-center justify-center rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-900"
              >
                Simulationで手を打つ →
              </Link>
            </div>
          </div>

          {alertCards.length > 0 && (
            <div className="mt-4 space-y-2">
              {alertCards.map((c) => (
                <div
                  key={c.cash_account_id}
                  className="rounded border border-neutral-700 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-neutral-100">
                      {c.account_name}
                    </div>
                    <span className="text-xs text-neutral-300">
                      {levelLabel(c.alert_level)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-neutral-300">
                    最初の警告：{monthLabel(c.first_alert_month)} / 予測残高：
                    {formatJPY(c.projected_ending_balance)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ok のときは静かに 1 行だけ */}
      {!showAlerts && (
        <p className="text-sm text-neutral-400">資金繰り：問題なし</p>
      )}

      {/* ダッシュボード本体 */}
      {children ?? null}
    </div>
  );
}