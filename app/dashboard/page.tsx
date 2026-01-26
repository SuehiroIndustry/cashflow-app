// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardClient from "./DashboardClient";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";

type Props = {
  searchParams?: Promise<{ account?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const accounts = await getAccounts();

  // URLの account を優先。なければ先頭口座。何もなければ null
  const accountParam = sp.account ? Number(sp.account) : NaN;
  const selectedAccountId =
    Number.isFinite(accountParam)
      ? accountParam
      : accounts.length > 0
      ? accounts[0].id
      : null;

  const monthly =
    selectedAccountId != null
      ? await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 24 })
      : [];

  // 今は一旦ダミー（必要なら後で戻す）
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