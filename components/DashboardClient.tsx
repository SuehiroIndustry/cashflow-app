// components/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDashboardOverview,
  type DashboardOverviewRow,
} from "@/lib/dashboard/getDashboardOverview";

export type Account = { id: number; name: string };

type DashboardSelection =
  | { mode: "all" }
  | { mode: "account"; cashAccountId: number };

type Props = {
  accounts: Account[];
  initialSelection?: DashboardSelection;
};

function formatYen(value: number) {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Intl が落ちる環境向けの保険
    return `¥${Math.round(value).toLocaleString("ja-JP")}`;
  }
}

export default function DashboardClient({
  accounts,
  initialSelection,
}: Props) {
  const normalizedAccounts = useMemo(() => {
    // 重複IDが来てもUIが死なないように一応ガード
    const map = new Map<number, Account>();
    for (const a of accounts ?? []) map.set(a.id, a);
    return Array.from(map.values());
  }, [accounts]);

  const [selection, setSelection] = useState<DashboardSelection>(
    initialSelection ?? { mode: "all" }
  );

  const [overview, setOverview] = useState<DashboardOverviewRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ UI状態(selection) → API引数({ accountId }) に変換して呼ぶ
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDashboardOverview({
          accountId: selection.mode === "account" ? selection.cashAccountId : null,
        });

        if (!alive) return;
        setOverview(data);
      } catch (e: any) {
        if (!alive) return;
        setOverview(null);
        setError(e?.message ?? "Failed to load dashboard");
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
    const base: { key: string; label: string; active: boolean; onClick: () => void }[] =
      [
        {
          key: "all",
          label: "All",
          active: selection.mode === "all",
          onClick: () => setSelection({ mode: "all" }),
        },
      ];

    for (const a of normalizedAccounts) {
      base.push({
        key: `account-${a.id}`,
        label: a.name,
        active: selection.mode === "account" && selection.cashAccountId === a.id,
        onClick: () => setSelection({ mode: "account", cashAccountId: a.id }),
      });
    }
    return base;
  }, [normalizedAccounts, selection]);

  const level = overview?.level ?? "GREEN";
  const riskScore = overview?.risk_score ?? 0;

  return (
    <div className="p-8 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>

        {/* ここは既存実装に合わせて（あるなら差し替えて） */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="border border-white/40 rounded px-3 py-1 text-sm hover:bg-white/10"
          >
            Logout
          </button>
        </form>
      </div>

      {/* Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {pills.map((p) => (
          <button
            key={p.key}
            onClick={p.onClick}
            className={[
              "px-3 py-1 rounded border text-sm",
              p.active
                ? "bg-white text-black border-white"
                : "border-white/40 hover:bg-white/10",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Status */}
      {error && (
        <div className="mb-6 border border-red-500/60 rounded p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="border border-white/35 rounded p-4">
          <div className="text-xs opacity-70 mb-1">現在残高</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : formatYen(overview?.current_balance ?? 0)}
          </div>
        </div>

        <div className="border border-white/35 rounded p-4">
          <div className="text-xs opacity-70 mb-1">今月の収入</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : formatYen(overview?.income_mtd ?? 0)}
          </div>
        </div>

        <div className="border border-white/35 rounded p-4">
          <div className="text-xs opacity-70 mb-1">今月の支出</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : formatYen(overview?.expense_mtd ?? 0)}
          </div>
        </div>

        <div className="border border-white/35 rounded p-4">
          <div className="text-xs opacity-70 mb-1">30日収入予定</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : formatYen(overview?.planned_income_30d ?? 0)}
          </div>
        </div>

        <div className="border border-white/35 rounded p-4">
          <div className="text-xs opacity-70 mb-1">30日支出予定</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : formatYen(overview?.planned_expense_30d ?? 0)}
          </div>
        </div>

        <div className="border border-white/35 rounded p-4">
          <div className="text-xs opacity-70 mb-1">30日後残高</div>
          <div className="text-2xl font-semibold">
            {loading ? "…" : formatYen(overview?.projected_balance_30d ?? 0)}
          </div>
        </div>
      </div>

      {/* Risk */}
      <div className="mt-6 border border-white/35 rounded p-4">
        <div className="text-xs opacity-70 mb-1">Risk</div>
        <div className="text-lg font-semibold">{loading ? "…" : level}</div>
        <div className="text-xs opacity-70">score: {loading ? "…" : riskScore}</div>

        {/* computed_at あるなら表示（任意） */}
        {overview?.computed_at && (
          <div className="text-xs opacity-50 mt-2">
            computed_at: {new Date(overview.computed_at).toLocaleString("ja-JP")}
          </div>
        )}
      </div>
    </div>
  );
}