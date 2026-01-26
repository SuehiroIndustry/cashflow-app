// app/dashboard/page.tsx

import DashboardClient, {
  type DashboardCashAlertCard,
  type DashboardCashStatus,
} from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
// EcoCharts は次のステップで接続

import {
  getCashAccountRiskAlerts,
  type CashAccountRiskAlertRow,
} from "./_actions/getCashAccountRiskAlerts";

import type { OverviewPayload } from "./_types";

/**
 * DBの警告View → Dashboard表示用に変換
 */
function toCashStatus(
  rows: CashAccountRiskAlertRow[],
): { cashStatus: DashboardCashStatus; alertCards: DashboardCashAlertCard[] } {
  const monitored = rows.length;

  const dangerRows = rows.filter((r) => r.risk_level === "RED");
  const warningRows = rows.filter((r) => r.risk_level === "YELLOW");

  const status: DashboardCashStatus["status"] =
    dangerRows.length > 0
      ? "danger"
      : warningRows.length > 0
      ? "warning"
      : "ok";

  const nonGreen = rows.filter((r) => r.risk_level !== "GREEN");

  const firstAlertMonth =
    nonGreen.length === 0
      ? null
      : nonGreen
          .map((r) => r.alert_month)
          .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))[0];

  const worstBalance =
    nonGreen.length === 0
      ? null
      : Math.min(...nonGreen.map((r) => r.alert_projected_ending_cash));

  const alertCards: DashboardCashAlertCard[] = nonGreen.map((r) => ({
    cash_account_id: r.cash_account_id,
    account_name: r.cash_account_name,
    first_alert_month: r.alert_month,
    projected_ending_balance: r.alert_projected_ending_cash,
    alert_level: r.risk_level === "RED" ? "danger" : "warning",
  }));

  return {
    cashStatus: {
      status,
      monitored_accounts: monitored,
      warning_count: warningRows.length,
      danger_count: dangerRows.length,
      first_alert_month: firstAlertMonth,
      worst_balance: worstBalance,
    },
    alertCards,
  };
}

export default async function DashboardPage() {
  // ① 警告情報（本物）
  const rows = await getCashAccountRiskAlerts();
  const { cashStatus, alertCards } = toCashStatus(rows);

  // ② Overview はまだ null でOK
  const payload: OverviewPayload | null = null;

  // ③ Balance は仮データ（型は今は気にしない）
  const balanceRows: any[] = [];

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Overview */}
        <OverviewCard payload={payload} />

        {/* Balance（rows 必須なので空配列） */}
        <BalanceCard rows={balanceRows} />

        {/* EcoCharts は次に接続 */}
        <div className="rounded-xl border border-neutral-700 bg-neutral-950 p-4 text-sm text-neutral-300">
          EcoCharts（次に接続）
        </div>
      </div>
    </DashboardClient>
  );
}