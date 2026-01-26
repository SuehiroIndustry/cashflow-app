// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { account?: string };
}) {
  const accounts = await getAccounts();

  // ✅ クエリのaccountを数値化。無ければ先頭口座にフォールバック
  const requestedId = Number(searchParams?.account ?? "");
  const fallbackId = accounts[0]?.id ?? null;

  const selectedAccountId =
    Number.isFinite(requestedId) && requestedId > 0 ? requestedId : fallbackId;

  const monthly =
    selectedAccountId != null ? await getMonthlyBalance(selectedAccountId) : [];

  // 今は一旦ダミー（後で戻す）
  const cashStatus = null;
  const alertCards: any[] = [];

  return (
    <DashboardClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
      cashStatus={cashStatus}
      alertCards={alertCards}
    />
  );
}