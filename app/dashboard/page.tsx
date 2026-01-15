// app/dashboard/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Overview = {
  current_balance: number;
  monthly_fixed_cost: number;
  month_expense: number;
  planned_orders_30d: number;
  projected_balance: number;
  level: "GREEN" | "YELLOW" | "RED" | string;
  computed_at: string | null;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(Number.isFinite(n) ? n : 0);
}

async function getOverview(): Promise<Overview> {
  // ✅ 重要：相対パスで叩く（Cookie/Sessionが落ちない）
  const res = await fetch("/api/overview", {
    cache: "no-store",
  });

  if (res.status === 401) {
    redirect("/login");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to load overview: ${res.status} ${text}`);
  }

  return (await res.json()) as Overview;
}

export default async function DashboardPage() {
  const overview = await getOverview();

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Cashflow Dashboard</h1>
        <p className="text-sm text-neutral-400">
          最終更新: {overview.computed_at ?? "-"}
        </p>
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
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">
              {yen(overview.projected_balance)}
            </span>
            <LevelBadge level={String(overview.level)} />
          </div>
        </Card>
      </section>
    </main>
  );
}

/* ===== components ===== */

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