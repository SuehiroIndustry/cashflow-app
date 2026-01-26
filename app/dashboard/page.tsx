// app/dashboard/page.tsx
import React from "react";

import DashboardClient from "./DashboardClient";
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { createClient } from "@/utils/supabase/server";

import { getCashAccountRiskAlerts } from "./_actions/getCashAccountRiskAlerts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

function monthStartISO(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10); // YYYY-MM-01 相当
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // ① 上部アラート（DB View から）
  const riskRows = await getCashAccountRiskAlerts();

  // cashStatus / alertCards を page.tsx 側で作る（DashboardClient の型に合わせる）
  const monitored = riskRows.length;
  const dangerCount = riskRows.filter((r) => r.risk_level === "RED").length;
  const warningCount = riskRows.filter((r) => r.risk_level === "YELLOW").length;

  const status =
    dangerCount > 0 ? "danger" : warningCount > 0 ? "warning" : "ok";

  const firstAlertRow =
    riskRows.find((r) => r.risk_level === "RED") ??
    riskRows.find((r) => r.risk_level === "YELLOW") ??
    null;

  const cashStatus = {
    status,
    monitored_accounts: monitored,
    warning_count: warningCount,
    danger_count: dangerCount,
    first_alert_month: firstAlertRow?.alert_month ?? null,
    worst_balance: firstAlertRow?.alert_projected_ending_cash ?? null,
  } as const;

  const alertCards = riskRows
    .filter((r) => r.risk_level === "RED" || r.risk_level === "YELLOW")
    .map((r) => ({
      cash_account_id: r.cash_account_id,
      account_name: r.cash_account_name,
      first_alert_month: r.alert_month,
      projected_ending_balance: r.alert_projected_ending_cash,
      alert_level: r.risk_level === "RED" ? "danger" : "warning",
    })) as const;

  // ② Overview / 推移 の対象口座を決める（危険→注意→なければ全口座）
  const targetCashAccountId =
    firstAlertRow?.cash_account_id ?? 0;

  const month = monthStartISO(new Date());

  // ③ Overview
  const payload = await getOverview({
    cashAccountId: targetCashAccountId,
    month,
  });

  // ④ Balance/EcoCharts 用の rows（直近12ヶ月）
  const balanceRows = await getMonthlyBalance({
    cashAccountId: targetCashAccountId,
    fromMonth: monthStartISO(new Date(new Date().setMonth(new Date().getMonth() - 11))),
    months: 12,
  });

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={[...alertCards]}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={payload} />
        <BalanceCard rows={balanceRows} />
        <EcoCharts rows={balanceRows} />
      </div>
    </DashboardClient>
  );
}