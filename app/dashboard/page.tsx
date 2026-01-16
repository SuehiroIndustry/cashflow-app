// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CashAccount = {
  id: number;
  name: string;
};

type OverviewRow = {
  cash_account_id: number;
  name: string;
  balance: number;
  month_income: number;
  month_expense: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  risk_level: string;
  computed_at: string;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    redirect('/login');
  }

  const { data: accounts, error: accountsError } = await supabase
    .from('cash_accounts')
    .select('id, name')
    .order('id');

  if (accountsError) {
    throw new Error(`Failed to fetch cash_accounts: ${accountsError.message}`);
  }

  // ここは view 側の一覧を使ってもいいけど、今のUIは /api/overview を叩いてるはずなので
  // 初期表示用にだけ “軽いデータ” を渡す（必要なら増やす）
  return (
    <DashboardClient
      initialAccounts={(accounts ?? []) as CashAccount[]}
      initialOverview={[] as OverviewRow[]}
    />
  );
}