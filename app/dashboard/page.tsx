// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";
import { getDashboardJudge } from "./_actions/getDashboardJudge";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
} from "./_types";

type Props = {
  searchParams?: {
    cashAccountId?: string;
  };
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function monthStartISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default async function DashboardPage({ searchParams }: Props) {
  // 1) 口座一覧
  const accounts = (await getAccounts()) as AccountRow[];

  // 2) 表示対象の口座ID（URL優先 → なければ先頭）
  const selectedFromQuery = toInt(searchParams?.cashAccountId);
  const cashAccountId = selectedFromQuery ?? (accounts?.[0]?.id ?? null);

  // 3) month（getOverview Input 必須）
  const month = monthStartISO();

  // 4) Overview（危険信号など）
  const overview = cashAccountId ? await getOverview({ cashAccountId, month }) : null;

  const cashStatus = (overview as any)?.cashStatus ?? null;
  const alertCards = ((overview as any)?.alertCards ?? []) as AlertCard[];

  // 5) 月次推移
  const monthlyRaw = (cashAccountId
    ? await getMonthlyBalance({ cashAccountId, months: 12 })
    : []) as MonthlyBalanceRow[];

  // ✅ カード側が「末尾=最新」前提なので、昇順に整える
  const monthly: MonthlyBalanceRow[] = [...monthlyRaw].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  // --- OverviewCard 用 payload を組み立てる ---
  const account = accounts?.find((a: any) => a.id === cashAccountId) as any;
  const accountName =
    typeof account?.name === "string"
      ? account.name
      : typeof account?.account_name === "string"
      ? account.account_name
      : "-";

  const thisMonthRow = monthly.find((r) => r.month === month);
  const thisMonthIncome = thisMonthRow?.income ?? 0;
  const thisMonthExpense = thisMonthRow?.expense ?? 0;
  const net = thisMonthIncome - thisMonthExpense;

  // ✅ 現在残高は「口座の current_balance / overview.currentBalance」を最優先にする
  //    monthly.balance は当月net等の可能性があるので最後の保険扱い
  const latestRow = monthly.length ? monthly[monthly.length - 1] : null;

  const accountCurrentBalance =
    typeof account?.current_balance === "number" && Number.isFinite(account.current_balance)
      ? account.current_balance
      : null;

  const overviewCurrentBalance =
    typeof (overview as any)?.currentBalance === "number" &&
    Number.isFinite((overview as any).currentBalance)
      ? (overview as any).currentBalance
      : typeof (overview as any)?.balance === "number" && Number.isFinite((overview as any).balance)
      ? (overview as any).balance
      : null;

  const currentBalance =
    accountCurrentBalance ??
    overviewCurrentBalance ??
    (typeof latestRow?.balance === "number" && Number.isFinite(latestRow.balance)
      ? latestRow.balance
      : 0);

  const overviewPayload: OverviewPayload = {
    accountName,
    currentBalance,
    thisMonthIncome,
    thisMonthExpense,
    net,
  } as OverviewPayload;

  // ✅ Dashboardに「実績判定」を追加（Simulationと同じロジック）
  const judge = cashAccountId ? await getDashboardJudge({ cashAccountId }) : null;

  const badge =
    judge?.level === "short"
      ? {
          label: "CRITICAL",
          className:
            "inline-flex items-center rounded-full border border-red-800 bg-red-950 px-2.5 py-1 text-xs font-semibold text-red-200",
        }
      : judge?.level === "warn"
      ? {
          label: "CAUTION",
          className:
            "inline-flex items-center rounded-full border border-yellow-800 bg-yellow-950 px-2.5 py-1 text-xs font-semibold text-yellow-200",
        }
      : {
          label: "SAFE",
          className:
            "inline-flex items-center rounded-full border border-emerald-800 bg-emerald-950 px-2.5 py-1 text-xs font-semibold text-emerald-200",
        };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 text-white">
      <DashboardClient
        cashStatus={cashStatus as CashStatus}
        alertCards={alertCards}
        accounts={accounts}
        monthly={monthly}
      >
        <div className="flex flex-col gap-4">
          {/* ✅ Overviewの右側に「実績判定」を追加（枠は別） */}
          <div className="grid gap-4 md:grid-cols-2">
            <OverviewCard payload={overviewPayload} />

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm">
              <div className="px-5 pt-4 text-sm font-semibold text-white">
                実績判定（直近6ヶ月平均）
              </div>
              <div className="px-5 pb-5 pt-3 text-sm text-neutral-200">
                <div className="flex items-start gap-3">
                  <span className={badge.className}>{badge.label}</span>
                  <div className="text-sm text-neutral-200">
                    {judge?.message ?? "判定データがありません"}
                  </div>
                </div>

                {/* ✅ 説明（3つ） */}
                <div className="mt-4 border-t border-neutral-800 pt-3 text-xs text-neutral-500 leading-relaxed">
                  <div className="font-semibold text-white mb-1">判定ロジック</div>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <span className="text-red-400 font-semibold">CRITICAL</span>：
                      12ヶ月後の推定残高がマイナス
                    </li>
                    <li>
                      <span className="text-yellow-400 font-semibold">CAUTION</span>：
                      残高30万円未満 または 平均収支がマイナス
                    </li>
                    <li>
                      <span className="text-emerald-400 font-semibold">SAFE</span>：
                      上記に該当しない場合
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* ここから下は今のまま */}
          <BalanceCard rows={monthly} />
          <EcoCharts rows={monthly} />
        </div>
      </DashboardClient>
    </div>
  );
}