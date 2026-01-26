// app/dashboard/page.tsx
import React from "react";

import DashboardClient, {
  type DashboardCashAlertCard,
  type DashboardCashStatus,
} from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getCashAccountRiskAlerts } from "./_actions/getCashAccountRiskAlerts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

function monthStartISO(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10); // YYYY-MM-01
}

export default async function DashboardPage() {
  // ① 上部アラート（DB View から）
  const riskRows = await getCashAccountRiskAlerts();

  const monitored = riskRows.length;
  const dangerCount = riskRows.filter((r) => r.risk_level === "RED").length;
  const warningCount = riskRows.filter((r) => r.risk_level === "YELLOW").length;

  const status: DashboardCashStatus["status"] =
    dangerCount > 0 ? "danger" : warningCount > 0 ? "warning" : "ok";

  const firstAlertRow =
    riskRows.find((r) => r.risk_level === "RED") ??
    riskRows.find((r) => r.risk_level === "YELLOW") ??
    null;

  const cashStatus: DashboardCashStatus = {
    status,
    monitored_accounts: monitored,
    warning_count: warningCount,
    danger_count: dangerCount,
    first_alert_month: firstAlertRow?.alert_month ?? null,
    worst_balance: firstAlertRow?.alert_projected_ending_cash ?? null,
  };

  // ✅ ここ：as const をやめて、型を明示して作る
  const alertCards: DashboardCashAlertCard[] = riskRows
    .filter((r) => r.risk_level === "RED" || r.risk_level === "YELLOW")
    .map((r) => ({
      cash_account_id: r.cash_account_id,
      account_name: r.cash_account_name,
      first_alert_month: r.alert_month,
      projected_ending_balance: r.alert_projected_ending_cash,
      alert_level: r.risk_level === "RED" ? "danger" : "warning",
    }));

  // ② Overview / 推移 の対象口座（危険→注意→なければ全口座）
  const targetCashAccountId = firstAlertRow?.cash_account_id ?? 0;

  const month = monthStartISO(new Date());

  // ③ Overview
  const payload = await getOverview({
    cashAccountId: targetCashAccountId,
    month,
  });

  // ④ Balance/EcoCharts 用の rows（直近12ヶ月）
  const fromMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    return monthStartISO(d);
  })();

  const balanceRows = await getMonthlyBalance({
    cashAccountId: targetCashAccountId,
    fromMonth,
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