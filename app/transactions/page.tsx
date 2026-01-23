import { createClient } from "@/utils/supabase/server";
import TransactionForm from "./transaction-form";
import TransactionsTable from "./transactions-table";
import { getRecentCashFlows } from "./_actions/getRecentCashFlows";

type Option = { id: number; name: string };

export default async function TransactionsPage() {
  const supabase = await createClient();

  const { data: accounts, error: aerr } = await supabase
    .from("cash_accounts")
    .select("id,name,current_balance")
    .order("id", { ascending: true });

  if (aerr) throw new Error(aerr.message);

  const { data: categories, error: cerr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("id", { ascending: true });

  if (cerr) throw new Error(cerr.message);

  const accountOptions: Option[] = (accounts ?? []).map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions: Option[] = (categories ?? []).map((c) => ({ id: c.id, name: c.name }));

  const initialCashAccountId = accountOptions.length ? accountOptions[0].id : null;

  const recent = await getRecentCashFlows({
    cashAccountId: initialCashAccountId,
    limit: 30,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Transactions</h1>
        <p className="text-sm opacity-70">実務用：最短入力 → 即反映 → 直近が見える</p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <TransactionForm
          accounts={accountOptions}
          categories={categoryOptions}
          initialCashAccountId={initialCashAccountId}
        />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <TransactionsTable initialRows={recent} />
      </div>
    </div>
  );
}