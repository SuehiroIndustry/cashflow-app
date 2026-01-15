"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getDashboardOverview } from "@/lib/dashboard/getDashboardOverview";

/**
 * UIで使う口座型（必要最低限）
 * ※プロジェクト側に Account 型があるなら、そっちに差し替えてOK
 */
export type Account = {
  id: number;
  name: string;
};

/**
 * getDashboardOverview が返してくる集計の想定形
 * （Supabase側で risk_level / risk_score / computed_at を用意している前提）
 *
 * ※もしフィールド名が違うなら、ここを実データに合わせて修正すればOK
 */
type Overview = {
  current_balance: number | null;
  month_income: number | null;
  month_expense: number | null;
  planned_orders_30d: number | null;
  projected_balance: number | null;

  risk_level: string | null; // "GREEN" etc
  risk_score: number | null;
  computed_at: string | null; // ISO string
};

/**
 * UIの選択状態
 */
type DashboardSelection =
  | { mode: "all" }
  | { mode: "account"; accountId: number };

type Props = {
  /**
   * サーバーコンポーネントから口座一覧を渡しているなら使う
   * 渡してない場合でも動くようにしてある（ボタンは All のみになる）
   */
  accounts?: Account[];
};

function yen(n: number | null | undefined) {
  const v = typeof n === "number" ? n : 0;
  return v.toLocaleString("ja-JP");
}

export default function DashboardClient({ accounts = [] }: Props) {
  const normalizedAccounts = useMemo(() => {
    // 重複排除（同名でも id でユニーク化）
    const map = new Map<number, Account>();
    for (const a of accounts) map.set(a.id, a);
    return Array.from(map.values());
  }, [accounts]);

  const [selection, setSelection] = useState<DashboardSelection>({ mode: "all" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    let alive = true;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        // ✅ getDashboardOverview には常に { accountId: number | null } を渡す
        const accountId = selection.mode === "all" ? null : selection.accountId;

        // プロジェクト側の返却型が別でも、ここで Overview へ寄せれば TS が安定する
        const data = (await getDashboardOverview({ accountId })) as unknown as Overview;

        if (!alive) return;
        setOverview(data);
      } catch (e: any) {
        if (!alive) return;
        setOverview(null);
        setError(e?.message ?? "Failed to load overview");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [selection]);

  const riskLevel = overview?.risk_level ?? "GREEN";
  const riskScore = overview?.risk_score ?? 0;
  const computedAt = overview?.computed_at ?? "";

  return (
    <div className="w-full">
      {/* タイトル行 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>

        <div className="flex items-center gap-2">
          {/* ここにログアウトボタン等があるなら差し込む */}
        </div>
      </div>

      {/* フィルタボタン */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelection({ mode: "all" })}
          className={[
            "rounded border px-3 py-1 text-sm",
            selection.mode === "all" ? "bg-white text-black" : "bg-transparent text-white",
          ].join(" ")}
        >
          All
        </button>

        {normalizedAccounts.map((a) => {
          const active = selection.mode === "account" && selection.accountId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelection({ mode: "account", accountId: a.id })}
              className={[
                "rounded border px-3 py-1 text-sm",
                active ? "bg-white text-black" : "bg-transparent text-white",
              ].join(" ")}
            >
              {a.name}
            </button>
          );
        })}
      </div>

      {/* 状態表示 */}
      {error && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </div>
      )}

      {/* カード */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="現在残高" value={`¥${yen(overview?.current_balance)}`} loading={loading} />
        <StatCard title="今月の収入" value={`¥${yen(overview?.month_income)}`} loading={loading} />
        <StatCard title="今月の支出" value={`¥${yen(overview?.month_expense)}`} loading={loading} />

        <StatCard title="30日収入予定" value={`¥${yen(overview?.planned_orders_30d)}`} loading={loading} />
        <StatCard title="30日支出予定" value={`¥${yen(0)}`} loading={loading} />
        <StatCard title="30日後残高" value={`¥${yen(overview?.projected_balance)}`} loading={loading} />
      </div>

      {/* Risk */}
      <div className="mt-4 rounded border p-4">
        <div className="text-sm opacity-80">Risk</div>
        <div className="mt-1 text-lg font-semibold">{riskLevel}</div>
        <div className="mt-1 text-xs opacity-70">score: {riskScore}</div>
        {computedAt ? <div className="mt-1 text-xs opacity-50">computed_at: {computedAt}</div> : null}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  loading,
}: {
  title: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded border p-4">
      <div className="text-xs opacity-70">{title}</div>
      <div className="mt-1 text-xl font-semibold">{loading ? "…" : value}</div>
    </div>
  );
}