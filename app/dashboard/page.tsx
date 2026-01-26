// app/dashboard/page.tsx
import React from "react";

import DashboardClient from "./DashboardClient";
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { createClient } from "@/utils/supabase/server";
import { getOverview } from "./_actions/getOverview";
import { getCashAccountRiskAlerts } from "./_actions/getCashAccountRiskAlerts";

function monthStartISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

type RiskRow = {
  cash_account_id: number;
  risk_level: "GREEN" | "YELLOW" | "RED" | string;
  alert_projected_ending_cash: number | null;
};

function riskScore(level: string) {
  // RED > YELLOW > GREEN
  if (level === "RED") return 3;
  if (level === "YELLOW") return 2;
  if (level === "GREEN") return 1;
  return 0;
}

function pickMostRiskyAccount(rows: RiskRow[] | null | undefined): number {
  const list = rows ?? [];
  if (list.length === 0) return 0;

  // 優先度: risk_level（RED>YELLOW>GREEN）→ 予測残高が小さい → id小さい
  let best = list[0];

  for (const r of list) {
    const a = best;
    const b = r;

    const sa = riskScore(String(a.risk_level));
    const sb = riskScore(String(b.risk_level));

    if (sb > sa) {
      best = b;
      continue;
    }
    if (sb < sa) continue;

    const ba = a.alert_projected_ending_cash ?? Number.POSITIVE_INFINITY;
    const bb = b.alert_projected_ending_cash ?? Number.POSITIVE_INFINITY;

    if (bb < ba) {
      best = b;
      continue;
    }
    if (bb > ba) continue;

    if (b.cash_account_id < a.cash_account_id) best = b;
  }

  return Number(best.cash_account_id) || 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // ① ダッシュボード上部の警告（既存Action）
  const { cashStatus, alertCards } = await getCashAccountRiskAlerts();

  // ② Overviewは「最も危険な口座」を選ぶ
  const { data: riskRows, error: riskErr } = await supabase
    .from("v_cash_account_risk_alerts")
    .select("cash_account_id, risk_level, alert_projected_ending_cash");

  if (riskErr) throw riskErr;

  const pickedAccountId = pickMostRiskyAccount(riskRows as RiskRow[]);

  // ③ 今月（YYYY-MM-01）
  const month = monthStartISO(new Date());

  // ④ Overviewの中身
  const payload = await getOverview({
    cashAccountId: pickedAccountId,
    month,
  });

  // ⑤ BalanceCard は rows 必須なので、とりあえず空配列で渡しておく（次で接続）
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