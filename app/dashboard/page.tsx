// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: accounts } = await supabase
    .from('cash_accounts')
    .select('id, name')
    .order('id');

  return <DashboardClient initialAccounts={accounts ?? []} />;
}