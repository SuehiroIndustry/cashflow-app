"use client";

import { useEffect, useState } from "react";
import {
  getDashboardOverview,
  type DashboardOverviewRow,
} from "@/lib/dashboard/getDashboardOverview";

/** 口座型（page.tsx と一致させる） */
export type Account = {
  id: number;
  name: string;
};

/** 選択状態 */
type DashboardSelection =
  | { mode: "all" }
  | { mode: "account"; cashAccountId: number };

type Props = {
  accounts: Account[];
};

export default function DashboardClient({ accounts }: Props) {
  const [selection, setSelection] = useState<DashboardSelection>({
    mode: "all",
  });

  const [overview, setOverview] = useState<DashboardOverviewRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** データ取得 */
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDashboardOverview(selection);
        if (!alive) return;

        setOverview(data);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Failed to load dashboard");
        setOverview(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selection]);

  return (
    <div className="p-6 space-y-6">
      {/* ===== フィルタ ===== */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1 rounded-full border ${
            selection.mode === "all" ? "opacity-100" : "opacity-60"
          }`}
          onClick={() => setSelection({ mode: "all" })}
        >
          All
        </button>

        {accounts.map((a) => (
          <button
            key={a.id}
            className={`px-3 py-1 rounded-full border ${
              selection.mode === "account" &&
              selection.cashAccountId === a.id
                ? "opacity-100"
                : "opacity-60"
            }`}
            onClick={() =>
              setSelection({ mode: "account", cashAccountId: a.id })
            }
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* ===== 状態表示 ===== */}
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {/* ===== KPI ===== */}
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

          <div className="md:col-span-3">
            <div className="p-4 border rounded-xl">
              <div className="text-sm opacity-70">Risk</div>
              <div className="text-xl font-semibold">
                {overview.risk_level}
              </div>
              <div className="text-xs opacity-60">
                score: {overview.risk_score}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** KPI コンポーネント */
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