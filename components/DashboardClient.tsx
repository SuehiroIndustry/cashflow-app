// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CashAccount = {
  id: number;
  name: string;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) redirect('/login');

  const { data: accounts, error: accountsError } = await supabase
    .from('cash_accounts')
    .select('id, name')
    .order('id');

  if (accountsError) {
    throw new Error(`Failed to fetch cash_accounts: ${accountsError.message}`);
  }

  return <DashboardClient initialAccounts={(accounts ?? []) as CashAccount[]} />;
}