// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CashAccount = {
  id: number;
  name: string;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: accounts, error: accErr } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .order("id");

  if (accErr) {
    // ここは好みで error.tsx に投げてもいい
    // とりあえず空配列でUIは動かす
    return <DashboardClient initialAccounts={[]} />;
  }

  return <DashboardClient initialAccounts={(accounts ?? []) as CashAccount[]} />;
}