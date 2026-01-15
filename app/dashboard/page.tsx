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

  const { data: overview, error: overviewError } = await supabase
    .from('v_dashboard_overview_user_v2')
    .select('*');

  if (overviewError) {
    throw new Error(`Failed to fetch dashboard overview: ${overviewError.message}`);
  }

  return (
    <DashboardClient
      initialAccounts={(accounts ?? []) as CashAccount[]}
      initialOverview={(overview ?? []) as OverviewRow[]}
    />
  );
}