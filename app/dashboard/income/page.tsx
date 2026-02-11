// app/dashboard/income/page.tsx
export const dynamic = "force-dynamic";

import IncomeClient from "./IncomeClient";
import { getAccounts } from "../_actions/getAccounts";
import { getCategories } from "./_actions/getCategories";
import { getRecentManualCashFlows } from "./_actions/getRecentManualCashFlows";

export default async function IncomePage() {
  const accounts = await getAccounts();
  const categories = await getCategories();

  // ✅ 手入力（manual）の直近一覧を取得して渡す
  const manualRows = await getRecentManualCashFlows({ limit: 30 });

  return (
    <div>
      <IncomeClient
        accounts={accounts}
        categories={categories}
        manualRows={manualRows}
      />
    </div>
  );
}