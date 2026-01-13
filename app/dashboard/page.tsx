// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

type CashAccountRow = {
  id: string;
  name: string;
};

type CashFlowRow = {
  id: number;
  cash_account_id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  cash_category_id: number | null;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // ログイン必須
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=%2Fdashboard");

  // 口座一覧（例：cash_accounts が user_id を持つ前提）
  const { data: accountsData, error: accountsError } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (accountsError) {
    // ここで落とすと Vercel で真っ白になりやすいので、画面側でエラー表示できるように返す
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>
        <p className="mt-4 text-red-400">
          Failed to load accounts: {accountsError.message}
        </p>
      </main>
    );
  }

  const accounts = (accountsData ?? []) as CashAccountRow[];

  // 直近の入出金一覧（例：cash_flows が user_id を持つ前提）
  const { data: flowsData, error: flowsError } = await supabase
    .from("cash_flows")
    .select(
      "id,cash_account_id,date,type,amount,currency,description,cash_category_id,created_at"
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (flowsError) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>
        <p className="mt-4 text-red-400">
          Failed to load cash flows: {flowsError.message}
        </p>
      </main>
    );
  }

  const flows = (flowsData ?? []) as CashFlowRow[];

  // ここから先はクライアントへ委譲：
  // - account filter の state 管理
  // - /api/summary?account=... を fetch（ブラウザから叩くので cookie 付き）
  // - 取得した income/expense/balance を表示
  return (
    <DashboardClient
      userEmail={user.email ?? ""}
      accounts={accounts}
      initialFlows={flows}
    />
  );
}