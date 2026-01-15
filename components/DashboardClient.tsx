// components/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDashboardOverview,
  type DashboardOverviewRow,
  type DashboardOverviewFilter,
} from "@/lib/dashboard/getDashboardOverview";

export type Account = { id: number; name: string };

type Props = {
  accounts: Account[];
};

/** =========================
 * Risk message（内包版）
 * ========================= */
function riskMessage(level: string, score: number) {
  switch (level) {
    case "RED":
      return {
        title: "RED",
        message: "資金ショートの可能性が高い状態です。至急対策が必要です。",
      };
    case "YELLOW":
      return {
        title: "YELLOW",
        message: "注意が必要な状態です。支出と入金予定を確認しましょう。",
      };
    case "GREEN":
    default:
      return {
        title: "GREEN",
        message: "健全なキャッシュフローです。",
      };
  }
}

export default function DashboardClient({ accounts }: Props) {
  const [selected, setSelected] = useState<DashboardOverviewFilter>({
    mode: "all",
  });

  const [overview, setOverview] = useState<DashboardOverviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** フィルタボタン（All = 全口座合算） */
  const chips = useMemo(
    () => [
      { key: "all" as const, label: "All" },
      ...accounts.map((a) => ({ key: a.id, label: a.name })),
    ],
    [accounts]
  );

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
        setErr(e?.message ?? "Failed to load dashboard");
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
    return riskMessage(
      String(overview.risk_level ?? "GREEN"),
      Number(overview.risk_score ?? 0)
    );
  }, [overview]);

  return (
    <div className="p-6 space-y-6">
      {/* ================= Filter ================= */}
      <div className="flex gap-2 flex-wrap">
        {chips.map((c) => {
          const active =
            c.key === "all"
              ? selected.mode === "all"
              : selected.mode === "account" &&
                selected.cashAccountId === c.key;

          return (
            <button
              key={c.key === "all" ? "all" : String(c.key)}
              className={[
                "px-3 py-1 rounded-full border transition",
                active ? "opacity-100" : "opacity-60 hover:opacity-90",
              ].join(" ")}
              onClick={() => {
                if (c.key === "all") setSelected({ mode: "all" });
                else
                  setSelected({
                    mode: "account",
                    cashAccountId: c.key,
                  });
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ================= State ================= */}
      {loading && <div>Loading...</div>}
      {err && <div className="text-red-500">{err}</div>}

      {/* ================= KPI ================= */}
      {overview && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Kpi title="現在残高" value={overview.current_balance} />
          <Kpi title="今月の収入" value={overview.income_mtd} />
          <Kpi title="今月の支出" value={overview.expense_mtd} />

          <Kpi title="30日収入予定" value={overview.planned_income_30d} />
          <Kpi title="30日支出予定" value={overview.planned_expense_30d} />
          <Kpi
            title="30日後予測残高"
            value={overview.projected_balance_30d}
          />

          {/* ================= Risk ================= */}
          <div className="md:col-span-3">
            <div className="p-4 border rounded-xl">
              <div className="text-sm opacity-70">Risk</div>
              <div className="mt-2">
                <div className="text-xl font-semibold">{risk?.title}</div>
                <div className="text-sm opacity-80 mt-1">
                  {risk?.message}
                </div>
                <div className="text-xs opacity-60 mt-2">
                  score: {overview.risk_score ?? 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** ================= KPI Component ================= */
function Kpi({
  title,
  value,
}: {
  title: string;
  value: number | null;
}) {
  const n = Number(value ?? 0);
  return (
    <div className="p-4 border rounded-xl">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-semibold">
        ¥{n.toLocaleString()}
      </div>
    </div>
  );
}