// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type OverviewRow = {
  user_id: string;
  current_balance: number | null;
  monthly_fixed_cost: number | null;
  month_expense: number | null;
  planned_orders_30d: number | null;
  projected_balance: number | null;
  level: "RED" | "YELLOW" | "GREEN" | string;
  computed_at: string | null;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(Number.isFinite(n) ? n : 0);
}

function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "RED"
      ? "bg-red-500/20 text-red-400"
      : level === "YELLOW"
      ? "bg-yellow-500/20 text-yellow-400"
      : "bg-green-500/20 text-green-400";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {level}
    </span>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-neutral-400 mb-1">{title}</p>
      {children}
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    // ここで落とすと白画面になるので、ログインへ逃がす
    redirect("/login");
  }
  if (!user) redirect("/login");

  // ✅ VIEW: dashboard_overview を直接参照（API経由しない）
  const { data, error } = await supabase
    .from("dashboard_overview")
    .select(
      "user_id,current_balance,monthly_fixed_cost,month_expense,planned_orders_30d,projected_balance,level,computed_at"
    )
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    // ここでthrowすると白画面確定なので、画面に出す（デバッグ優先）
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-4">Dashboard Error</h1>
        <pre className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm whitespace-pre-wrap">
          {error.message}
        </pre>
      </main>
    );
  }

  const row = (data?.[0] ?? null) as OverviewRow | null;

  const overview = {
    current_balance: Number(row?.current_balance ?? 0),
    monthly_fixed_cost: Number(row?.monthly_fixed_cost ?? 0),
    month_expense: Number(row?.month_expense ?? 0),
    planned_orders_30d: Number(row?.planned_orders_30d ?? 0),
    projected_balance: Number(row?.projected_balance ?? 0),
    level: row?.level ?? "GREEN",
    computed_at: row?.computed_at ?? null,
  };

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6 text-white">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cashflow Dashboard</h1>
          <p className="text-sm text-neutral-400">
            Logged in: {user.email ?? "-"}
          </p>
          <p className="text-xs text-neutral-500">
            computed_at: {overview.computed_at ?? "-"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <LevelBadge level={String(overview.level)} />
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="現在残高">
          <span className="text-2xl font-semibold">
            {yen(overview.current_balance)}
          </span>
        </Card>

        <Card title="今月の支出">
          <span className="text-2xl font-semibold text-red-400">
            {yen(overview.month_expense)}
          </span>
        </Card>

        <Card title="固定費（月）">
          <span className="text-2xl font-semibold text-orange-400">
            {yen(overview.monthly_fixed_cost)}
          </span>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="30日以内の支払予定">
          <span className="text-xl">{yen(overview.planned_orders_30d)}</span>
        </Card>

        <Card title="30日後予測残高">
          <span className="text-2xl font-bold">
            {yen(overview.projected_balance)}
          </span>
        </Card>
      </section>
    </main>
  );
}