// app/dashboard/page.tsx
import DashboardClient from "./DashboardClient";
import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";
import { getCashStatus } from "./_actions/getCashStatus";
import { getRiskRows } from "./_actions/getRiskRows";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { account?: string };
}) {
  const accounts = await getAccounts();

  const preferredId =
    accounts.find((a) => a.name === "現金")?.id ?? accounts[0]?.id ?? null;

  const selectedAccountId = (() => {
    const q = searchParams?.account;
    if (!q) return preferredId;
    const n = Number(q);
    return Number.isFinite(n) ? n : preferredId;
  })();

  const cashStatus = await getCashStatus({ cashAccountId: selectedAccountId });
  const riskRows = await getRiskRows({ cashAccountId: selectedAccountId });

  // アラートカード生成（ここは既存ロジックに合わせて）
  const alertCards = riskRows
    .filter((r) => r.risk_level === "RED" || r.risk_level === "YELLOW")
    .map((r) => ({
      cash_account_id: r.cash_account_id,
      cash_account_name: r.cash_account_name,
      risk_level: r.risk_level,
      first_short_month: r.first_short_month,
      worst_balance: r.worst_balance,
      message: r.message,
    }));

  const monthly = selectedAccountId
    ? await getMonthlyBalance({ cashAccountId: selectedAccountId, months: 12 })
    : [];

  return (
    <DashboardClient
      cashStatus={cashStatus}
      alertCards={alertCards}
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
    />
  );
}