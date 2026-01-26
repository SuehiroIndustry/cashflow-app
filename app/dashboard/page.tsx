// app/dashboard/page.tsx
import React from "react";

import DashboardClient from "./DashboardClient";
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getOverview } from "./_actions/getOverview";
import { getCashAccountRiskAlerts } from "./_actions/getCashAccountRiskAlerts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

function monthStartISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

type RiskLevel = "GREEN" | "YELLOW" | "RED";

type RiskRow = {
  cash_account_id: number;
  cash_account_name?: string | null;
  risk_level: RiskLevel | string;
  alert_month?: string | null;
  alert_projected_ending_cash?: number | null;
};

function riskScore(level: string) {
  if (level === "RED") return 3;
  if (level === "YELLOW") return 2;
  if (level === "GREEN") return 1;
  return 0;
}

function pickMostRiskyAccount(rows: RiskRow[]): number {
  if (rows.length === 0) return 0;

  let best = rows[0];

  for (const r of rows) {
    const sa = riskScore(String(best.risk_level));
    const sb = riskScore(String(r.risk_level));

    if (sb > sa) {
      best = r;
      continue;
    }
    if (sb < sa) continue;

    const ba = best.alert_projected_ending_cash ?? Number.POSITIVE_INFINITY;
    const bb = r.alert_projected_ending_cash ?? Number.POSITIVE_INFINITY;

    if (bb < ba) {
      best = r;
      continue;
    }
    if (bb > ba) continue;

    if ((r.cash_account_id ?? 0) < (best.cash_account_id ?? 0)) best = r;
  }

  return Number(best.cash_account_id) || 0;
}

function computeCashStatus(rows: RiskRow[]) {
  const monitored = rows.length;

  const warning_count = rows.filter((r) => String(r.risk_level) === "YELLOW").length;
  const danger_count = rows.filter((r) => String(r.risk_level) === "RED").length;

  const status: "ok" | "warning" | "danger" =
    danger_count > 0 ? "danger" : warning_count > 0 ? "warning" : "ok";

  const alertMonths = rows
    .filter((r) => String(r.risk_level) !== "GREEN")
    .map((r) => r.alert_month)
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .sort();

  const first_alert_month = alertMonths.length > 0 ? alertMonths[0] : null;

  const worstNums = rows
    .filter((r) => String(r.risk_level) !== "GREEN")
    .map((r) => r.alert_projected_ending_cash)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x));

  const worst_balance = worstNums.length > 0 ? Math.min(...worstNums) : null;

  return {
    status,
    monitored_accounts: monitored,
    warning_count,
    danger_count,
    first_alert_month,
    worst_balance,
  };
}

function computeAlertCards(rows: RiskRow[]) {
  return rows
    .filter((r) => {
      const lv = String(r.risk_level);
      return lv === "YELLOW" || lv === "RED";
    })
    .map((r) => {
      const lv = String(r.risk_level);
      const alert_level: "danger" | "warning" = lv === "RED" ? "danger" : "warning";

      return {
        cash_account_id: Number(r.cash_account_id),
        account_name: r.cash_account_name ?? `口座ID:${r.cash_account_id}`,
        first_alert_month: r.alert_month ?? monthStartISO(new Date()),
        projected_ending_balance: Number(r.alert_projected_ending_cash ?? 0),
        alert_level,
      };
    });
}

export default async function DashboardPage() {
  // ① 警告（配列）
  const riskRowsRaw = await getCashAccountRiskAlerts();
  const riskRows = (riskRowsRaw ?? []) as RiskRow[];

  // ② 上部警告バー
  const cashStatus = computeCashStatus(riskRows);
  const alertCards = computeAlertCards(riskRows);

  // ③ Dashboardの“主役口座”＝最も危険な口座
  const pickedAccountId = pickMostRiskyAccount(riskRows);

  // ④ Overview
  const month = monthStartISO(new Date());
  const payload = await getOverview({
    cashAccountId: pickedAccountId,
    month,
  });

  // ⑤ Balance/EcoCharts：直近12ヶ月（主役口座の月次）
  const balanceRows = await getMonthlyBalance({
    cashAccountId: pickedAccountId,
    months: 12,
  });

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={payload} />
        <BalanceCard rows={balanceRows} />
        <EcoCharts rows={balanceRows} />
      </div>
    </DashboardClient>
  );
}