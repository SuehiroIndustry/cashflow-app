// app/transactions/new/page.tsx
import TransactionForm from "./transaction-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Option = { id: number; name: string };

export default async function NewTransactionPage() {
  const supabase = await createSupabaseServerClient();

  // accounts
  const { data: accountsData, error: accountsError } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .order("id", { ascending: true });

  if (accountsError) throw accountsError;

  // categories
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("id", { ascending: true });

  if (categoriesError) throw categoriesError;

  const accounts: Option[] = (accountsData ?? []).map((a) => ({
    id: Number(a.id),
    name: String(a.name),
  }));

  const categories: Option[] = (categoriesData ?? []).map((c) => ({
    id: Number(c.id),
    name: String(c.name),
  }));

  // 初期表示は先頭アカウント（なければ null）
  const initialCashAccountId = accounts.length > 0 ? accounts[0].id : null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">New Transaction</h1>

      <div className="mt-6">
        <TransactionForm
          accounts={accounts}
          categories={categories}
          initialCashAccountId={initialCashAccountId}
        />
      </div>
    </div>
  );
}