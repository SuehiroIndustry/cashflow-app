// app/transactions/page.tsx
import TransactionsClient from "./transactions-client";

import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getRecentCashFlows } from "./_actions/getRecentCashFlows";
import { getCashCategories } from "./_actions/getCashCategories";

export default async function TransactionsPage() {
  const accounts = await getAccounts();
  const categories = await getCashCategories();

  const initialCashAccountId: number = accounts.length ? (accounts[0].id as number) : 0;

  const recent =
    initialCashAccountId !== 0
      ? await getRecentCashFlows({ cashAccountId: initialCashAccountId, limit: 30 })
      : [];

  return (
    <TransactionsClient
      initialAccounts={accounts.map((a: any) => ({ id: a.id as number, name: a.name as string }))}
      initialCategories={categories}
      initialCashAccountId={initialCashAccountId}
      initialRows={recent}
    />
  );
}