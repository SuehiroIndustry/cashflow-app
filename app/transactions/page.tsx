// app/transactions/page.tsx
import TransactionsClient from "./transactions-client";

import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getCashCategories } from "./_actions/getCashCategories";
import { getRecentCashFlows } from "./_actions/getRecentCashFlows";

export default async function TransactionsPage() {
  const accounts = await getAccounts();
  const categories = await getCashCategories();

  // ✅ 口座が0件なら、ここで止める（nullを渡さない）
  const firstAccountId = accounts[0]?.id;
  if (!firstAccountId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Transactions</h1>
        <p className="mt-3 opacity-80">
          口座がまだ作成されていません。先に口座を作成してください。
        </p>
      </div>
    );
  }

  const recent = await getRecentCashFlows({
    cashAccountId: firstAccountId,
    limit: 30,
  });

  return (
    <TransactionsClient
      initialAccounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      initialCategories={categories}
      initialCashAccountId={firstAccountId} // ✅ number確定
      initialRows={recent}
    />
  );
}