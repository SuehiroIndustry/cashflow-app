// app/transactions/page.tsx
import TransactionsClient from "./transactions-client";

import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getRecentCashFlows } from "./_actions/getRecentCashFlows";
import { getCashCategories } from "./_actions/getCashCategories";

export default async function TransactionsPage() {
  const accounts = await getAccounts();
  const categories = await getCashCategories();

  const initialCashAccountId = accounts.length ? accounts[0].id : null;

  const recent =
    initialCashAccountId == null
      ? []
      : await getRecentCashFlows({
          cashAccountId: initialCashAccountId,
          limit: 30,
        });

  return (
    <TransactionsClient
      initialAccounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      initialCategories={categories}
      initialCashAccountId={initialCashAccountId}
      initialRows={recent}
    />
  );
}