// app/dashboard/page.tsx
import React from "react";

import DashboardClient from "./DashboardClient";
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { createClient } from "@/utils/supabase/server";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type { DashboardCashAlertCard, DashboardCashStatus } from "./DashboardClient";
import type { OverviewPayload, MonthlyBalanceRow } from "./_types";

type CashAccountRiskLevel = "GREEN" | "YELLOW" | "RED";

type CashAccountRiskAlertRow = {
  cash_account_id: number;
  cash_account_name: string;
  risk_level: CashAccountRiskLevel;
  alert_month: string; // YYYY-MM-01
  alert_projected_ending_cash: number;
};

function computeCashStatus(rows: CashAccountRiskAlertRow[]): DashboardCashStatus {
  const monitored = rows.length;

  const danger = rows.filter((r) => r.risk_level === "RED").length;
  const warning = rows.filter((r) => r.risk_level === "YELLOW").length;

  let status: "ok" | "warning" | "danger" = "ok";
  if (danger > 0) status = "danger";
  else if (warning > 0) status = "warning";

  const firstAlertMonth =
    rows
      .filter((r) => r.risk_level === "RED" || r.risk_level === "YELLOW")
      .map((r) => r.alert_month)
      .sort()[0] ?? null;

  const worstBalance =
    rows
      .filter((r) => r.risk_level === "RED" || r.risk_level === "YELLOW")
      .map((r) => r.alert_projected_ending_cash)
      .sort((a, b) => a - b)[0] ?? null;

  return {
    status,
    monitored_accounts: monitored,
    warning_count: warning,
    danger_count: danger,
    first_alert_month: firstAlertMonth,
    worst_balance: worstBalance,
  };
}

function computeAlertCards(rows: CashAccountRiskAlertRow[]): DashboardCashAlertCard[] {
  return rows
    .filter((r) => r.risk_level === "RED" || r.risk_level === "YELLOW")
    .map((r) => ({
      cash_account_id: r.cash_account_id,
      account_name: r.cash_account_name,
      first_alert_month: r.alert_month,
      projected_ending_balance: r.alert_projected_ending_cash,
      alert_level: r.risk_level === "RED" ? "danger" : "warning",
    }));
}

function pickWorstAccountId(rows: CashAccountRiskAlertRow[]): number {
  // REDがあればREDの中で「最悪（最小残高）」の口座
  const reds = rows.filter((r) => r.risk_level === "RED");
  if (reds.length) {
    reds.sort((a, b) => a.alert_projected_ending_cash - b.alert_projected_ending_cash);
    return reds[0].cash_account_id;
  }

  // 次にYELLOW
  const yellows = rows.filter((r) => r.risk_level === "YELLOW");
  if (yellows.length) {
    yellows.sort((a, b) => a.alert_projected_ending_cash - b.alert_projected_ending_cash);
    return yellows[0].cash_account_id;
  }

  // 何もなければ全口座
  return 0;
}

function currentMonthStartISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // ① DB View：v_cash_account_risk_alerts を読む（あなたが作ったView名に合わせてる）
  const { data: riskRowsRaw, error: riskErr } = await supabase
    .from("v_cash_account_risk_alerts")
    .select("cash_account_id, cash_account_name, risk_level, alert_month, alert_projected_ending_cash")
    .order("cash_account_id", { ascending: true });

  if (riskErr) throw riskErr;

  const riskRows = (riskRowsRaw ?? []) as unknown as CashAccountRiskAlertRow[];

  const cashStatus = computeCashStatus(riskRows);
  const alertCards = computeAlertCards(riskRows);

  // ② Overview / 月次の対象口座を決める（最悪の口座）
  const targetCashAccountId = pickWorstAccountId(riskRows);

  // month は「当月」でOK（必要なら後でUIから選べるようにする）
  const month = currentMonthStartISO();

  // ③ Overview
  let payload: OverviewPayload | null = null;
  try {
    payload = await getOverview({ cashAccountId: targetCashAccountId, month });
  } catch {
    payload = null;
  }

  // ④ 月次（BalanceCard / EcoCharts）
  let balanceRows: MonthlyBalanceRow[] = [];
  try {
    balanceRows = await getMonthlyBalance({
      cashAccountId: targetCashAccountId,
      fromMonth: month,
      months: 12,
    });
  } catch {
    balanceRows = [];
  }

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