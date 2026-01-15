// components/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { getDashboardOverview } from "@/lib/dashboard/getDashboardOverview";

export type Account = { id: number; name: string };

type DashboardSelection =
  | { mode: "all" }
  | { mode: "account"; cashAccountId: number };

type Overview = {
  current_balance: number;
  monthly_fixed_cost: number;
  month_expense: number;
  planned_orders_30d: number;
  projected_balance: number;
  level: "GREEN" | "YELLOW" | "RED";
  computed_at: string | null;
};

type Props = {
  accounts: Account[];
};

const yen = (v: number) =>
  `¥${Math.round(v).toLocaleString("ja-JP")}`;

export default function DashboardClient({ accounts }: Props) {
  const [selection, setSelection] = useState<DashboardSelection>({
    mode: "all",
  });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDashboardOverview({
          accountId:
            selection.mode === "account"
              ? selection.cashAccountId
              : null,
        });

        if (!alive) return;
        setOverview(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load overview");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selection]);

  const pills = useMemo(() => {
    return [
      {
        key: "all",
        label: "All",
        active: selection.mode === "all",
        onClick: () => setSelection({ mode: "all" }),
      },
      ...accounts.map((a) => ({
        key: a.id,
        label: a.name,
        active:
          selection.mode === "account" &&
          selection.cashAccountId === a.id,
        onClick: () =>
          setSelection({ mode: "account", cashAccountId: a.id }),
      })),
    ];
  }, [accounts, selection]);

  return (
    <div className="p-8 text-white">
      <h1 className="text-xl font-semibold mb-6">
        Cashflow Dashboard
      </h1>

      <div className="flex gap-2 mb-6">
        {pills.map((p) => (
          <button
            key={p.key}
            onClick={p.onClick}
            className={`px-3 py-1 border rounded text-sm ${
              p.active
                ? "bg-white text-black"
                : "border-white/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <Card title="現在残高" value={yen(overview?.current_balance ?? 0)} loading={loading} />
        <Card title="今月の収入" value={yen(overview?.monthly_fixed_cost ?? 0)} loading={loading} />
        <Card title="今月の支出" value={yen(overview?.month_expense ?? 0)} loading={loading} />
        <Card title="30日収入予定" value={yen(overview?.planned_orders_30d ?? 0)} loading={loading} />
        <Card title="30日支出予定" value="¥0" loading={loading} />
        <Card title="30日後残高" value={yen(overview?.projected_balance ?? 0)} loading={loading} />
      </div>

      <div className="mt-6 border border-white/40 rounded p-4">
        <div className="text-xs opacity-70">Risk</div>
        <div className="text-lg font-semibold">
          {overview?.level ?? "GREEN"}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  loading,
}: {
  title: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="border border-white/40 rounded p-4">
      <div className="text-xs opacity-70 mb-1">{title}</div>
      <div className="text-2xl font-semibold">
        {loading ? "…" : value}
      </div>
    </div>
  );
}