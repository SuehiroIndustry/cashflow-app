// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  // 認証チェック（未ログインなら /login へ）
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect("/login");
  }

  // UIはクライアント側に任せる
  return <DashboardClient />;
}