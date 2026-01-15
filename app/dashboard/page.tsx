// app/dashboard/page.tsx
import DashboardClient from "@/components/DashboardClient";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  // 🔽 ユーザーの口座一覧を取得
  const { data: accounts, error } = await supabase
    .from("cash_accounts")
    .select("id, name")
    .order("id");

  if (error) {
    return <div>Failed to load accounts</div>;
  }

  // UIはクライアントに任せる
  return <DashboardClient accounts={accounts ?? []} />;
}