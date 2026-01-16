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

  // ✅ 正しい設計：Overviewは「まだ無い」を表せるので null を許容
  // 初期表示は null（DashboardClient側でフェッチ or Refreshで取得）
  return (
    <DashboardClient
      initialAccounts={accounts ?? []}
      initialOverview={null}
    />
  );
}