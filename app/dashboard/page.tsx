// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import DashboardClient from "./DashboardClient";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import type { AccountRow, OverviewPayload, MonthlyBalanceRow } from "./_types";

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

export default async function Page({ searchParams }: Props) {
  const accounts = (await getAccounts()) as AccountRow[];

  // ✅ 楽天銀行しかない（= 口座が1つ）なら自動選択
  const singleAccountId = accounts.length === 1 ? accounts[0].id : null;

  // 複数口座がある未来に備えて query も残す（ただし今は単一想定）
  const fromQuery = toInt(searchParams?.cashAccountId);
  const cashAccountId = singleAccountId ?? fromQuery;

  // 口座が確定できないケース（= 0件 or 複数で未選択）
  if (!cashAccountId) {
    const overviewPayload: OverviewPayload | null = null;
    const monthly: MonthlyBalanceRow[] = [];

    return (
      <DashboardClient accounts={accounts} selectedAccountId={null}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
          <div className="text-sm opacity-80">
            まずは口座を用意してください。（現在、口座が見つかりません）
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <OverviewCard payload={overviewPayload} />
            <BalanceCard rows={monthly} />
            <EcoCharts rows={monthly} />
          </div>
        </div>
      </DashboardClient>
    );
  }

  const [overviewPayload, monthly] = await Promise.all([
    getOverview({ cashAccountId, month: monthStartISO() }),
    getMonthlyBalance({ cashAccountId, months: 12 }),
  ]);

  return (
    <DashboardClient accounts={accounts} selectedAccountId={cashAccountId}>
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard payload={overviewPayload} />
        <BalanceCard rows={monthly} />
        <EcoCharts rows={monthly} />
      </div>
    </DashboardClient>
  );
}