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

  // ✅ 初期口座は「現金」優先（なければ先頭）
  const preferredId =
    accounts.find((a) => a.name === "現金")?.id ?? accounts[0]?.id ?? null;

  const selectedAccountId = (() => {
    const q = searchParams?.account;
    if (!q) return preferredId;
    const n = Number(q);
    return Number.isFinite(n) ? n : preferredId;
  })();

  const monthly = await getMonthlyBalance({
    cashAccountId: selectedAccountId,
    months: 24,
  });

  // ✅ ひとまずビルドを通すため、リスク/ステータスは空で渡す
  // （次のステップでDBビューからちゃんと取る）
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