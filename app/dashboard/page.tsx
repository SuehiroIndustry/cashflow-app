import { createServerClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

type PageProps = {
  searchParams?: {
    cashAccountId?: string;
  };
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = createServerClient();

  /* ===============================
     1. 口座一覧を取得
  =============================== */
  const { data: accounts, error: accountsError } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .order("id");

  if (accountsError) {
    throw new Error(accountsError.message);
  }

  if (!accounts || accounts.length === 0) {
    return <div className="p-6">口座が登録されていません</div>;
  }

  /* ===============================
     2. 選択中の口座IDを決定
        - URL優先
        - なければ先頭
  =============================== */
  const selectedAccountId = (() => {
    const fromUrl = Number(searchParams?.cashAccountId);
    if (fromUrl && accounts.some(a => a.id === fromUrl)) {
      return fromUrl;
    }
    return accounts[0].id;
  })();

  /* ===============================
     3. 月次残高取得
  =============================== */
  const { data: monthly, error: monthlyError } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("cash_account_id", selectedAccountId)
    .order("month");

  if (monthlyError) {
    throw new Error(monthlyError.message);
  }

  /* ===============================
     4. レンダリング
     👉 key は「最後の return」でのみ使う
  =============================== */
  return (
    <DashboardClient
      key={`dash-${selectedAccountId}`} // ← ここだけ
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly ?? []}
    />
  );
}