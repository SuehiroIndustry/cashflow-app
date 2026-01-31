// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardClient from "./DashboardClient";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: {
    cashAccountId?: string | string[];
  };
};

function toInt(v: unknown): number | null {
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (Array.isArray(v) && typeof v[0] === "string") {
    const n = Number(v[0]);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();

  // 1) 口座一覧
  const { data: accountsRaw, error: accountsError } = await supabase
    .from("cash_accounts")
    .select("id, name, current_balance")
    .order("id", { ascending: true });

  if (accountsError) {
    console.error("[dashboard/page] accounts error:", accountsError);
    return <div className="p-6">口座取得でエラーが発生しました</div>;
  }

  const accounts = (accountsRaw ?? []).map((a: any) => ({
    id: Number(a.id),
    name: String(a.name ?? ""),
    current_balance: Number(a.current_balance ?? 0),
  }));

  if (!accounts.length) {
    return <div className="p-6">口座が登録されていません</div>;
  }

  // 2) 選択口座（URL優先 / なければ先頭）
  const requestedId = toInt(searchParams?.cashAccountId);
  const selectedAccountId =
    requestedId != null && accounts.some((a) => a.id === requestedId)
      ? requestedId
      : accounts[0].id;

  // 3) 月次残高（選択口座のみに絞る）
  const { data: monthlyRaw, error: monthlyError } = await supabase
    .from("monthly_cash_account_balances")
    .select("month, income, expense, balance")
    .eq("cash_account_id", selectedAccountId)
    .order("month", { ascending: true });

  if (monthlyError) {
    console.error("[dashboard/page] monthly error:", monthlyError);
    return <div className="p-6">月次取得でエラーが発生しました</div>;
  }

  const monthly = (monthlyRaw ?? []).map((m: any) => ({
    month: String(m.month),
    income: Number(m.income ?? 0),
    expense: Number(m.expense ?? 0),
    balance: Number(m.balance ?? 0),
  }));

  // ✅ ここで key を使う（selectedAccountId 決定後）
  return (
    <DashboardClient
      key={`dash-${selectedAccountId}`}
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      monthly={monthly}
    />
  );
}