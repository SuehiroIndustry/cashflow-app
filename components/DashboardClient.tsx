// components/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type Account = {
  id: number;
  name: string;
};

type DashboardSelection =
  | { mode: "all" }
  | { mode: "account"; accountId: number };

type Overview = {
  current_balance: number;
  monthly_fixed_cost: number;
  month_expense: number;
  planned_orders_30d: number;
  projected_balance: number;
  level: "RED" | "YELLOW" | "GREEN" | string;
  computed_at: string | null;
};

function yen(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * ✅ ビルド落ちしない設計
 * - props は optional（page.tsx が <DashboardClient /> のままでもOK）
 * - getDashboardOverview 等の外部型/関数に依存しない（型ズレで死なない）
 * - /api/overview は現状 user_id で1行返す前提。accountId を渡しても無視されても壊れない
 */
export default function DashboardClient(props: { accounts?: Account[] } = {}) {
  const normalizedAccounts = useMemo(() => {
    const list = props.accounts ?? [];
    const map = new Map<number, Account>();
    for (const a of list) {
      if (!map.has(a.id)) map.set(a.id, a);
    }
    return Array.from(map.values());
  }, [props.accounts]);

  const [selection, setSelection] = useState<DashboardSelection>({ mode: "all" });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // /api/overview から取得（選択はクエリに載せる。サーバ側が未対応でもOK）
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams();
        if (selection.mode === "all") {
          qs.set("mode", "all");
        } else {
          qs.set("mode", "account");
          qs.set("accountId", String(selection.accountId));
        }

        const res = await fetch(`/api/overview?${qs.toString()}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          const msg =
            typeof payload?.error === "string"
              ? payload.error
              : `Failed to load overview (HTTP ${res.status})`;
          throw new Error(msg);
        }

        const data = (await res.json()) as Partial<Overview>;

        const next: Overview = {
          current_balance: Number(data.current_balance ?? 0),
          monthly_fixed_cost: Number(data.monthly_fixed_cost ?? 0),
          month_expense: Number(data.month_expense ?? 0),
          planned_orders_30d: Number(data.planned_orders_30d ?? 0),
          projected_balance: Number(data.projected_balance ?? 0),
          level: (data.level ?? "GREEN") as Overview["level"],
          computed_at: (data.computed_at ?? null) as string | null,
        };

        if (!alive) return;
        setOverview(next);
      } catch (e: any) {
        if (!alive) return;
        setOverview(null);
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

  const riskScore = 0; // 今は /api/overview が返してないので固定（必要なら後でAPI拡張）

  const pills = useMemo(() => {
    const base: Array<{ key: string; label: string; value: DashboardSelection }> = [
      { key: "all", label: "All", value: { mode: "all" } },
    ];
    const accounts = normalizedAccounts.map((a) => ({
      key: `acc-${a.id}`,
      label: a.name,
      value: { mode: "account" as const, accountId: a.id },
    }));
    return [...base, ...accounts];
  }, [normalizedAccounts]);

  const isSelected = (v: DashboardSelection) => {
    if (selection.mode !== v.mode) return false;
    if (selection.mode === "all") return true;
    return selection.accountId === (v as any).accountId;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Cashflow Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* ここはプロジェクト側の実装に合わせて差し替えてOK */}
            <a
              href="/auth/signout"
              className="rounded-md border border-white/30 px-3 py-2 text-sm hover:bg-white/10"
            >
              Logout
            </a>
          </div>
        </div>

        {/* Pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {pills.map((p) => {
            const active = isSelected(p.value);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelection(p.value)}
                className={cx(
                  "rounded-md border px-3 py-2 text-sm transition",
                  active
                    ? "border-white bg-white text-black"
                    : "border-white/30 bg-transparent text-white hover:bg-white/10"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="mt-8">
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="現在残高" value={loading ? "…" : yen(overview?.current_balance ?? 0)} />
            <Card title="今月の収入" value={loading ? "…" : yen(overview?.monthly_fixed_cost ?? 0)} />
            <Card title="今月の支出" value={loading ? "…" : yen(overview?.month_expense ?? 0)} />
            <Card title="30日収入予定" value={loading ? "…" : yen(0)} />
            <Card title="30日支出予定" value={loading ? "…" : yen(overview?.planned_orders_30d ?? 0)} />
            <Card title="30日後残高" value={loading ? "…" : yen(overview?.projected_balance ?? 0)} />
          </div>

          <div className="mt-4 rounded-xl border border-white/30 p-5">
            <div className="text-sm text-white/70">Risk</div>
            <div className="mt-1 text-xl font-semibold">{loading ? "…" : overview?.level ?? "GREEN"}</div>
            <div className="mt-1 text-xs text-white/60">score: {loading ? "…" : riskScore}</div>
            {overview?.computed_at && (
              <div className="mt-3 text-xs text-white/40">computed_at: {overview.computed_at}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card(props: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/30 p-5">
      <div className="text-sm text-white/70">{props.title}</div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
    </div>
  );
}