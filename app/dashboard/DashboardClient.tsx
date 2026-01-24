"use client";

import React from "react";
import Link from "next/link";

// 既存で使ってるコンポーネントがあるなら、そのまま import して下の {children} の代わりに置いてOK
// import OverviewCard from "./_components/OverviewCard";
// import BalanceCard from "./_components/BalanceCard";
// import EcoCharts from "./_components/EcoCharts";

type CashStatus = "ok" | "warning" | "danger";

type DashboardCashStatus = {
  status: CashStatus;
  monitored_accounts: number;
  warning_count: number;
  danger_count: number;
  first_alert_month: string | null;
  worst_balance: number | null;
};

type DashboardCashAlertCard = {
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
  // isoDate: "2026-01-01" などを想定
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}年${m}月`;
}

export default function DashboardClient(props: {
  cashStatus: DashboardCashStatus; // server から渡す
  alertCards: DashboardCashAlertCard[]; // server から渡す（okなら空でOK）
  // 既存のダッシュボード本体をそのまま差し込みたいなら children で囲む
  children?: React.ReactNode;
}) {
  const { cashStatus, alertCards, children } = props;

  const showAlerts = cashStatus.status !== "ok"; // ④ OKなら出さない
  const msg = getCashStatusLabel(cashStatus.status);

  return (
    <div className="space-y-6">
      {/* ② + ④：warning/danger だけ“意味つき”で表示。OKなら黙る */}
      {showAlerts && (
        <section className="rounded-lg border border-neutral-700 bg-neutral-950 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex rounded border px-2 py-0.5 text-sm font-semibold">
                  {msg.badge}
                </span>
                <span className="text-sm text-neutral-300">
                  監視口座：{cashStatus.monitored_accounts} / 警告：{cashStatus.warning_count} / 危険：
                  {cashStatus.danger_count}
                </span>
              </div>

              <p className="mt-2 text-sm text-neutral-200">{msg.message}</p>

              {/* “次の一手”は言葉で */}
              {cashStatus.first_alert_month && (
                <p className="mt-1 text-sm text-neutral-300">
                  最初の警告：{monthLabel(cashStatus.first_alert_month)}
                  {cashStatus.worst_balance != null && (
                    <>
                      {" "}
                      / 最悪残高：{formatJPY(cashStatus.worst_balance)}
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/simulation"
                className="inline-flex items-center justify-center rounded border px-3 py-2 text-sm hover:bg-neutral-900"
              >
                Simulationで手を打つ →
              </Link>
            </div>
          </div>

          {/* 警告カード（最小） */}
          {alertCards.length > 0 && (
            <div className="mt-4 space-y-2">
              {alertCards.map((c) => (
                <div key={c.cash_account_id} className="rounded border border-neutral-700 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{c.account_name}</div>
                    <span className="text-xs text-neutral-300">{c.alert_level.toUpperCase()}</span>
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

      {/* ④：OKのときは“警告エリア”は出さない（黙る）。代わりに必要なら静かな1行だけ */}
      {!showAlerts && (
        <p className="text-sm text-neutral-400">
          資金繰り：問題なし
        </p>
      )}

      {/* 既存のダッシュボード本体（今までのOverview/Charts/表など）はここにそのまま置く */}
      {children ?? null}
    </div>
  );
}