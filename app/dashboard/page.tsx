// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardClient from "./DashboardClient";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

type SearchParams = { account?: string | string[] };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const accounts = await getAccounts();

  const accountParam = searchParams?.account;
  const parsedAccountId =
    typeof accountParam === "string" && accountParam.trim() !== ""
      ? Number(accountParam)
      : null;

  const isValidNumber =
    parsedAccountId != null && Number.isFinite(parsedAccountId);

  const existsInAccounts =
    isValidNumber && accounts.some((a) => a.id === parsedAccountId);

  const selectedAccountId =
    existsInAccounts ? (parsedAccountId as number) : accounts[0]?.id ?? null;

  const monthly =
    selectedAccountId != null
      ? await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })
      : [];

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