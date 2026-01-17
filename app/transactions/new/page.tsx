import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TransactionForm from "./transaction-form";

export default async function NewTransactionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 口座
  const { data: accounts, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .order("id", { ascending: true });

  if (accErr) throw new Error(accErr.message);

  // カテゴリ（※ cash_categories は user_id 無い想定）
  const { data: categories, error: catErr } = await supabase
    .from("cash_categories")
    .select("id,name")
    .order("id", { ascending: true });

  if (catErr) throw new Error(catErr.message);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-xl font-semibold">New Transaction</h1>
        <p className="text-sm text-white/60 mt-1">
          収入/支出を1件登録します（manual）
        </p>

        <div className="mt-6">
          <TransactionForm
            accounts={accounts ?? []}
            categories={categories ?? []}
          />
        </div>
      </div>
    </main>
  );
}