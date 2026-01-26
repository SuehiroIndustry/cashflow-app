// app/dashboard/page.tsx
import React from "react";

import { createClient } from "@/utils/supabase/server";

import DashboardClient, {
  type DashboardCashStatus,
  type DashboardCashAlertCard,
} from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getOverview } from "./_actions/getOverview";
import { getCashAccountRiskAlerts, type CashAccountRiskAlertRow } from "./_actions/getCashAccountRiskAlerts";

import type { MonthlyBalanceRow, OverviewPayload } from "./_types";

/**
 * 月初(YYYY-MM-01)を返す
 */
function monthStartISO(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  return x.toISOString().slice(0, 10);
}

function toStatus(riskLevel: string): "warning" | "danger" | null {
  if (riskLevel === "RED") return "danger";
  if (riskLevel === "YELLOW") return "warning";
  return null;
}

function computeCashStatus(rows: CashAccountRiskAlertRow[]): DashboardCashStatus {
  const monitored_accounts = rows.length;

  let warning_count = 0;
  let danger_count = 0;

  let first_alert_month: string | null = null;
  let worst_balance: number | null = null;

  for (const r of rows) {
    const lv = toStatus(r.risk_level);
    if (lv === "warning") warning_count += 1;
    if (lv === "danger") danger_count += 1;

    if (lv) {
      if (!first_alert_month || r.alert_month < first_alert_month) {
        first_alert_month = r.alert_month;
      }
      if (worst_balance == null || r.alert_projected_ending_cash < worst_balance) {
        worst_balance = r.alert_projected_ending_cash;
      }
    }
  }

  const status: "ok" | "warning" | "danger" =
    danger_count > 0 ? "danger" : warning_count > 0 ? "warning" : "ok";

  return {
    status,
    monitored_accounts,
    warning_count,
    danger_count,
    first_alert_month,
    worst_balance,
  };
}

function computeAlertCards(rows: CashAccountRiskAlertRow[]): DashboardCashAlertCard[] {
  // ✅ “警告/危険”だけカード化（GREEN は除外）
  const cards = rows
    .map((r) => {
      const lv = toStatus(r.risk_level);
      if (!lv) return null;

      const card: DashboardCashAlertCard = {
        cash_account_id: r.cash_account_id,
        account_name: r.cash_account_name,
        first_alert_month: r.alert_month,
        projected_ending_balance: r.alert_projected_ending_cash,
        alert_level: lv, // ← "warning" | "danger" に確定
      };
      return card;
    })
    .filter(Boolean) as DashboardCashAlertCard[];

  // 重大度順 → 月順 → 残高悪い順
  cards.sort((a, b) => {
    const w = (x: "warning" | "danger") => (x === "danger" ? 0 : 1);
    const d = w(a.alert_level) - w(b.alert_level);
    if (d !== 0) return d;

    const m = a.first_alert_month.localeCompare(b.first_alert_month);
    if (m !== 0) return m;

    return a.projected_ending_balance - b.projected_ending_balance;
  });

  return cards;
}

/**
 * “最も危険な口座”を選ぶ（Overview用）
 * - RED がいれば RED 優先
 * - 次に YELLOW
 * - なければ 0(全口座)
 */
function pickMostRiskyAccountId(rows: CashAccountRiskAlertRow[]): number {
  const dangers = rows.filter((r) => r.risk_level === "RED");
  if (dangers.length) return dangers[0]!.cash_account_id;

  const warns = rows.filter((r) => r.risk_level === "YELLOW");
  if (warns.length) return warns[0]!.cash_account_id;

  return 0;
}

/**
 * 月次残高（BalanceCard / EcoCharts）
 * - monthly_cash_account_balances が無い/権限NGでも落とさない
 */
async function getMonthlyBalanceRows(cashAccountId: number): Promise<MonthlyBalanceRow[]> {
  try {
    const supabase = await createClient();

    let q = supabase
      .from("monthly_cash_account_balances")
      .select("month,income,expense,balance")
      .order("month", { ascending: true });

    if (cashAccountId !== 0) q = q.eq("cash_account_id", cashAccountId);

    const { data, error } = await q;
    if (error) {
      console.error("[dashboard] monthly balances error:", error);
      return [];
    }
    if (!Array.isArray(data)) return [];

    return data.map((r: any) => ({
      month: String(r.month ?? ""),
      income: Number(r.income ?? 0),
      expense: Number(r.expense ?? 0),
      balance: Number(r.balance ?? 0),
    }));
  } catch (e) {
    console.error("[dashboard] monthly balances unexpected:", e);
    return [];
  }
}

export default async function DashboardPage() {
  // ① 上部警告（絶対落とさない）
  const riskRows: CashAccountRiskAlertRow[] = await getCashAccountRiskAlerts().catch((e) => {
    console.error("[dashboard] risk alerts failed:", e);
    return [];
  });

  const cashStatus = computeCashStatus(riskRows);
  const alertCards = computeAlertCards(riskRows);

  // ② Overview の対象口座
  const targetAccountId = pickMostRiskyAccountId(riskRows);
  const month = monthStartISO(new Date());

  // ③ Overview（落としてもOK：画面は出す）
  let payload: OverviewPayload | null = null;
  try {
    payload = await getOverview({ cashAccountId: targetAccountId, month });
  } catch (e) {
    console.error("[dashboard] getOverview failed:", e);
    payload = null;
  }

  // ④ 月次残高（落としてもOK）
  const balanceRows = await getMonthlyBalanceRows(targetAccountId);

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