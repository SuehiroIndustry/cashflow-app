// app/dashboard/page.tsx
export const dynamic = "force-dynamic";

import { getAccounts } from "./_actions/getAccounts";
import { getOverview } from "./_actions/getOverview";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

import DashboardClient from "./DashboardClient";

import type {
  AccountRow,
  MonthlyBalanceRow,
  OverviewPayload,
} from "./_types";

type Props = {
  // Next.js 16: searchParams が Promise 扱いになるケースがある
  searchParams?: Promise<{
    cashAccountId?: string;
  }>;
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

export default async function Page(props: Props) {
  // ✅ searchParams を await してから使う（Next.js 16対応）
  const sp = (await props.searchParams) ?? {};
  const fromQuery = toInt(sp.cashAccountId);

  // 口座一覧
  const accounts = (await getAccounts()) as AccountRow[];

  // 口座が1つだけならそれを採用、複数ならクエリ優先
  const singleAccountId = accounts.length === 1 ? accounts[0].id : null;
  const cashAccountId = singleAccountId ?? fromQuery;

  // ✅ 口座が確定できないなら、DB取得はしない（型エラー根絶）
  if (!cashAccountId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">ダッシュボード</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          口座が未選択です。上部の口座セレクタ（またはURLの cashAccountId）を指定してください。
        </p>
      </div>
    );
  }

  // ✅ getOverview は month 必須（ここが今回のエラー原因）
  const month = monthStartISO(new Date());

  const overview = (await getOverview({
    cashAccountId,
    month,
  })) as OverviewPayload;

  const monthly = (await getMonthlyBalance({
    cashAccountId,
  })) as MonthlyBalanceRow[];

  return (
    <DashboardClient
      cashStatus={overview.cashStatus}
      alertCards={overview.alertCards}
      accounts={accounts}
      monthly={monthly}
    />
  );
}