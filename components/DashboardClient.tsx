"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDashboardOverview,
  DashboardOverviewRow,
} from "@/lib/dashboard/getDashboardOverview";

type Account = { id: number; name: string };

export default function DashboardClient() {
  // ここは実データに置き換えてOK
  const accounts: Account[] = useMemo(
    () => [{ id: 4, name: "メイン口座" }],
    []
  );

  const [selected, setSelected] = useState<
    { mode: "all" } | { mode: "account"; cashAccountId: number }
  >({ mode: "all" });

  const [overview, setOverview] = useState<DashboardOverviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        // ✅ rows じゃない。overview 1行を取る。
        const row = await getDashboardOverview(selected);
        if (!alive) return;
        setOverview(row);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load");
        setOverview(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selected]);

  return (
    <div className="p-6 space-y-6">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1 rounded-full border ${
            selected.mode === "all" ? "opacity-100" : "opacity-60"
          }`}
          onClick={() => setSelected({ mode: "all" })}
        >
          All
        </button>

        {accounts.map((a) => (
          <button
            key={a.id}
            className={`px-3 py-1 rounded-full border ${
              selected.mode === "account" && selected.cashAccountId === a.id
                ? "opacity-100"
                : "opacity-60"
            }`}
            onClick={() => setSelected({ mode: "account", cashAccountId: a.id })}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && <div>Loading...</div>}
      {err && <div className="text-red-500">{err}</div>}

      {overview && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Kpi title="現在残高" value={overview.current_balance} />
          <Kpi title="今月の収入" value={overview.income_mtd} />
          <Kpi title="今月の支出" value={overview.expense_mtd} />
          <Kpi title="30日収入予定" value={overview.planned_income_30d} />
          <Kpi title="30日支出予定" value={overview.planned_expense_30d} />
          <Kpi title="30日後予測残高" value={overview.projected_balance_30d} />

          <div className="md:col-span-3">
            <div className="p-4 border rounded-xl">
              <div className="text-sm opacity-70">Risk</div>
              <div className="text-xl font-semibold">{overview.risk_level}</div>
              <div className="text-xs opacity-60">score: {overview.risk_score}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <div className="p-4 border rounded-xl">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-semibold">
        ¥{Number(value ?? 0).toLocaleString()}
      </div>
    </div>
  );
}