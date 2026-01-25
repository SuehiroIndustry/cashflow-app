import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getDashboardCashStatus } from "./_actions/getDashboardCashStatus";
import { getDashboardCashAlertCards } from "./_actions/getDashboardCashAlertCards";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OverviewPayload, MonthlyBalanceRow } from "./_types";

const THRESHOLD = 1_000_000;

// 取れなかった時に UI を落とさない最低限の値
function fallbackOverviewPayload(): OverviewPayload {
  // OverviewPayload の形はプロジェクト側定義に依存するので、
  // 「落ちない」こと優先で any 経由にしてる（後で厳密化してOK）
  return {} as unknown as OverviewPayload;
}

export default async function DashboardPage() {
  // ① 警告ブロック用（ここは既存通り）
  const cashStatus = await getDashboardCashStatus(THRESHOLD);
  const alertCards =
    cashStatus.status === "ok" ? [] : await getDashboardCashAlertCards(THRESHOLD);

  // ② 既存カード用データ（payload / rows）を Server で用意する
  //    supabase client 生成が落ちてもページを落とさない
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    supabase = null;
  }

  // monthly rows（BalanceCard / EcoCharts 用）
  let monthlyRows: MonthlyBalanceRow[] = [];
  if (supabase) {
    const { data, error } = await supabase
      .from("v_dash_monthly_by_account")
      .select("*")
      .order("month", { ascending: true });

    if (!error && data) {
      monthlyRows = data as unknown as MonthlyBalanceRow[];
    } else {
      // 取れなくても画面は落とさない
      monthlyRows = [];
    }
  } else {
    monthlyRows = [];
  }

  // overview payload（OverviewCard 用）
  let overviewPayload: OverviewPayload = fallbackOverviewPayload();
  if (supabase) {
    const { data, error } = await supabase
      .from("v_dash_latest_balance_by_account")
      .select("*");

    if (!error && data) {
      // OverviewCard が期待する payload 形にここで整形するのが本筋。
      // いったん any で渡して「画面が進む」状態にする（後で payload を確定させよう）。
      overviewPayload = ({ latestByAccount: data } as unknown) as OverviewPayload;
    }
  } else {
    overviewPayload = fallbackOverviewPayload();
  }

  return (
    <DashboardClient cashStatus={cashStatus} alertCards={alertCards}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={overviewPayload} />
        <BalanceCard rows={monthlyRows} />
        <EcoCharts rows={monthlyRows} />
      </div>
    </DashboardClient>
  );
}