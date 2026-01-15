// app/dashboard/page.tsx
import DashboardClient from "@/components/DashboardClient";
import { getDashboardOverview } from "@/lib/dashboard/getDashboardOverview";

export default async function DashboardPage() {
  const { rows, computedAt } = await getDashboardOverview();

  // 口座名は仮。実データが別であるなら後で差し替えOK
  // ここでは rows に出てきた cash_account_id をベースに作る
  const accounts = Array.from(
    new Map(rows.map((r) => [r.cash_account_id, { id: r.cash_account_id, name: `口座 ${r.cash_account_id}` }])).values()
  ).sort((a, b) => a.id - b.id);

  return (
    <DashboardClient
      rows={rows}
      accounts={accounts}
      computedAt={computedAt}
    />
  );
}