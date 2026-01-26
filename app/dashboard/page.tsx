// app/dashboard/page.tsx

import DashboardClient from "./DashboardClient";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

type SearchParams = {
  account?: string | string[];
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const accounts = await getAccounts();

  // --- ✅ account クエリの安全なパース（ここが肝）
  const accountParam = searchParams?.account;

  const parsedAccountId =
    typeof accountParam === "string" && accountParam.trim() !== ""
      ? Number(accountParam)
      : null;

  const isValidNumber =
    parsedAccountId != null && Number.isFinite(parsedAccountId);

  // 指定IDが accounts に存在するかもチェック（存在しないIDなら落とす）
  const existsInAccounts =
    isValidNumber && accounts.some((a) => a.id === parsedAccountId);

  const selectedAccountId =
    existsInAccounts ? (parsedAccountId as number) : accounts[0]?.id ?? null;

  // --- 月次取得
  const monthly =
    selectedAccountId != null
      ? await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })
      : [];

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