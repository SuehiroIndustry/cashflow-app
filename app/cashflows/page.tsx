import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

import CashflowsClient from "./CashflowsClient";
import { getAccountsAndCategories } from "./_actions/getAccountsAndCategories";
import { getCashflows } from "./_actions/getCashflows";

export default async function CashflowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { accounts, categories } = await getAccountsAndCategories();
  const initialAccountId = accounts[0]?.id ?? 1;

  const initialRows =
    initialAccountId ? await getCashflows({ cash_account_id: initialAccountId }) : [];

  return (
    <CashflowsClient
      accounts={accounts}
      categories={categories}
      initialAccountId={initialAccountId}
      initialRows={initialRows}
    />
  );
}