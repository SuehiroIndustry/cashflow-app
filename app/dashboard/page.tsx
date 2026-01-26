// app/dashboard/page.tsx
import React from "react";

import DashboardClient from "./DashboardClient";
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getOverview } from "./_actions/getOverview";
import { getCashAccountRiskAlerts } from "./_actions/getCashAccountRiskAlerts";

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

  // 優先度: RED > YELLOW > GREEN → 予測残高が小さい → id 小さい
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

  // 最初の警告（YELLOW/RED の中で最小の月）
  const alertMonths = rows
    .filter((r) => String(r.risk_level) !== "GREEN")
    .map((r) => r.alert_month)
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .sort();

  const first_alert_month = alertMonths.length > 0 ? alertMonths[0] : null;

  // 最悪残高（YELLOW/RED の中で最小）
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
  // YELLOW/RED だけカードに出す
  return rows
    .filter((r) => String(r.risk_level) === "YELLOW" || String(r.risk_level) === "RED")
    .map((r) => ({
      cash_account_id: Number(r.cash_account_id),
      account_name: r.cash_account_name ?? `口座ID:${r.cash_account_id}`,
      first_alert_month: r.alert_month ?? monthStartISO(new Date()),
      projected_ending_balance: Number(r.alert_projected_ending_cash ?? 0),
      alert_level: String(r.risk_level) === "RED" ? "danger" : "warning",
    }));
}

export default async function DashboardPage() {
  // ① DBの警告View（Actionの戻り値は「配列」）
  const riskRowsRaw = await getCashAccountRiskAlerts();
  const riskRows = (riskRowsRaw ?? []) as RiskRow[];

  // ② 上部の警告バー用（DashboardClientに渡す）
  const cashStatus = computeCashStatus(riskRows);
  const alertCards = computeAlertCards(riskRows);

  // ③ Overviewは「最も危険な口座」を選ぶ
  const pickedAccountId = pickMostRiskyAccount(riskRows);

  // ④ Overviewの対象月（今月）
  const month = monthStartISO(new Date());

  // ⑤ Overview payload（今の getOverview を使用）
  const payload = await getOverview({
    cashAccountId: pickedAccountId,
    month,
  });

  // ⑥ BalanceCard は rows 必須。次で本接続するので今は空配列で通す
  const balanceRows: any[] = [];

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={payload} />
        <BalanceCard rows={balanceRows} />
        <EcoCharts />
      </div>
    </DashboardClient>
  );
}