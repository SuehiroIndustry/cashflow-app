// components/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDashboardOverview,
  type DashboardOverviewRow,
  type DashboardOverviewFilter,
} from "@/lib/dashboard/getDashboardOverview";
import { riskMessage } from "@/lib/dashboard/riskMessage";

export type Account = { id: number; name: string };

type Props = {
  accounts: Account[];
};

export default function DashboardClient({ accounts }: Props) {
  const [selected, setSelected] = useState<DashboardOverviewFilter>({ mode: "all" });

  const [overview, setOverview] = useState<DashboardOverviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ボタン表示用（All + 口座）
  const chips = useMemo(() => {
    return [{ key: "all" as const, label: "All" }, ...accounts.map((a) => ({ key: a.id, label: a.name }))];
  }, [accounts]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
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

  const risk = useMemo(() => {
    if (!overview) return null;
    return riskMessage(String(overview.risk_level ?? "GREEN"), Number(overview.risk_score ?? 0));
  }, [overview]);

  return (
    <div className="p-6 space-y-6">
      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {chips.map((c) => {
          const active =
            c.key === "all"
              ? selected.mode === "all"
              : selected.mode === "account" && selected.cashAccountId === c.key;

          return (
            <button
              key={c.key === "all" ? "all" : String(c.key)}
              className={[
                "px-3 py-1 rounded-full border transition",
                active ? "opacity-100" : "opacity-60 hover:opacity-90",
              ].join(" ")}
              onClick={() => {
                if (c.key === "all") setSelected({ mode: "all" });
                else setSelected({ mode: "account", cashAccountId: c.key });
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* State */}
      {loading && <div>Loading...</div>}
      {err && <div className="text-red-500">{err}</div>}

      {/* Content */}
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

              <div className="mt-2 flex items-end justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xl font-semibold">{risk?.title ?? String(overview.risk_level ?? "GREEN")}</div>
                  <div className="text-sm opacity-80 mt-1">
                    {risk?.message ?? "リスク状態の説明がありません。"}
                  </div>
                  <div className="text-xs opacity-60 mt-2">score: {Number(overview.risk_score ?? 0)}</div>
                </div>

                {/* 任意：computed_at を出したい場合 */}
                {/* <div className="text-xs opacity-50">computed_at: {overview.computed_at}</div> */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number | null }) {
  const n = Number(value ?? 0);
  return (
    <div className="p-4 border rounded-xl">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-semibold">¥{n.toLocaleString()}</div>
    </div>
  );
}