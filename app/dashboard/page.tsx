// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { account?: string };
}) {
  const accounts = await getAccounts();

  const requestedId = searchParams?.account ? Number(searchParams.account) : null;

  const selectedAccountId =
    requestedId != null &&
    Number.isFinite(requestedId) &&
    accounts.some((a) => a.id === requestedId)
      ? requestedId
      : accounts[0]?.id ?? null;

  const monthly =
    selectedAccountId != null
      ? await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })
      : [];

  // いまはダミーのままでOK
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