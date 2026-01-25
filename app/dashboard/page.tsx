import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getDashboardCashStatus } from "./_actions/getDashboardCashStatus";
import { getDashboardCashAlertCards } from "./_actions/getDashboardCashAlertCards";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OverviewPayload, MonthlyBalanceRow } from "./_types";

const THRESHOLD = 1_000_000;

function fallbackOverviewPayload(): OverviewPayload {
  return {} as unknown as OverviewPayload;
}

function PlaceholderCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm opacity-80">{message}</div>
    </div>
  );
}

export default async function DashboardPage() {
  // ① 警告ブロック用（落とさない版に直してある前提）
  const cashStatus = await getDashboardCashStatus(THRESHOLD);
  const alertCards =
    cashStatus.status === "ok" ? [] : await getDashboardCashAlertCards(THRESHOLD);

  // ② Supabase client 生成が落ちてもページを落とさない
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    console.error("createSupabaseServerClient failed:", e);
    supabase = null;
  }

  // monthly rows（BalanceCard / EcoCharts 用）
  let monthlyRows: MonthlyBalanceRow[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("v_dash_monthly_by_account")
        .select("*")
        .order("month", { ascending: true });

      if (!error && data) {
        monthlyRows = data as unknown as MonthlyBalanceRow[];
      }
    } catch (e) {
      console.error("fetch v_dash_monthly_by_account failed:", e);
      monthlyRows = [];
    }
  }

  // overview payload（OverviewCard 用）
  let overviewPayload: OverviewPayload = fallbackOverviewPayload();
  let hasOverview = false;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("v_dash_latest_balance_by_account")
        .select("*");

      if (!error && data) {
        overviewPayload = ({ latestByAccount: data } as unknown) as OverviewPayload;
        // “空でも落ちない”ように最低限の存在チェック
        hasOverview = Array.isArray(data) && data.length > 0;
      }
    } catch (e) {
      console.error("fetch v_dash_latest_balance_by_account failed:", e);
      overviewPayload = fallbackOverviewPayload();
      hasOverview = false;
    }
  }

  const hasMonthly = monthlyRows.length > 0;

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        {hasOverview ? (
          <OverviewCard payload={overviewPayload} />
        ) : (
          <PlaceholderCard title="Overview" message="データが未取得のため表示できません。" />
        )}

        {hasMonthly ? (
          <BalanceCard rows={monthlyRows} />
        ) : (
          <PlaceholderCard title="Balance" message="月次データが未取得のため表示できません。" />
        )}

        {hasMonthly ? (
          <EcoCharts rows={monthlyRows} />
        ) : (
          <PlaceholderCard title="Charts" message="月次データが未取得のため表示できません。" />
        )}
      </div>
    </DashboardClient>
  );
}