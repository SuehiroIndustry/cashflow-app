"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { OverviewCard } from "./OverviewCard";

type CashAccount = {
  id: number;
  name: string;
};

type Overview = {
  current_balance: number;
  month_income: number;
  month_expense: number;
  net_month: number;
  planned_income_30d: number;
  planned_expense_30d: number;
  net_planned_30d: number;
  projected_balance: number;
  projected_balance_30d?: number;
  risk_level: string;
  risk_score: number;
  computed_at: string | null;
};

function toInt(v: unknown): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toOverview(v: any): Overview {
  return {
    current_balance: toInt(v?.current_balance),
    month_income: toInt(v?.month_income),
    month_expense: toInt(v?.month_expense),
    net_month: toInt(v?.net_month),
    planned_income_30d: toInt(v?.planned_income_30d),
    planned_expense_30d: toInt(v?.planned_expense_30d),
    net_planned_30d: toInt(v?.net_planned_30d),
    projected_balance: toInt(v?.projected_balance),
    projected_balance_30d: toInt(v?.projected_balance_30d),
    risk_level: String(v?.risk_level ?? "GREEN"),
    risk_score: toInt(v?.risk_score),
    computed_at: v?.computed_at ?? null,
  };
}

export default function DashboardClient() {
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createBrowserClient(url, key);
  }, []);

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string>("all");
  const [appliedId, setAppliedId] = useState<string>("all");

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 口座一覧を Supabase から取得（RLS前提）
  const loadAccounts = useCallback(async () => {
    setError(null);

    const { data, error } = await supabase
      .from("cash_accounts")
      .select("id,name")
      .order("id", { ascending: true });

    if (error) {
      setError(error.message);
      setAccounts([]);
      return;
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped: CashAccount[] = rows
      .filter((r: any) => r && r.id != null)
      .map((r: any) => ({ id: Number(r.id), name: String(r.name ?? `口座#${r.id}`) }));

    setAccounts(mapped);
  }, [supabase]);

  const loadOverview = useCallback(async (accountId: string) => {
    setLoading(true);
    setError(null);

    try {
      const qs =
        accountId === "all"
          ? ""
          : `?cash_account_id=${encodeURIComponent(accountId)}`;

      const res = await fetch(`/api/overview${qs}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? "API error");
        setOverview(null);
        return;
      }

      // データが実質ゼロで computed_at も無いなら「未登録」扱いにしてカード側でメッセージ
      const ov = toOverview(json);
      const isEmpty =
        (!ov.computed_at || ov.computed_at === "—") &&
        ov.current_balance === 0 &&
        ov.month_income === 0 &&
        ov.month_expense === 0 &&
        ov.planned_income_30d === 0 &&
        ov.planned_expense_30d === 0;

      setOverview(isEmpty ? null : ov);
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初回ロード
    (async () => {
      await loadAccounts();
      await loadOverview("all");
    })();
  }, [loadAccounts, loadOverview]);

  const appliedLabel = useMemo(() => {
    if (appliedId === "all") return "All accounts";
    const idNum = Number(appliedId);
    const a = accounts.find((x) => x.id === idNum);
    return a?.name ?? `口座#${appliedId}`;
  }, [appliedId, accounts]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Cashflow Dashboard</h1>
            <div className="mt-1 text-sm text-white/60">
              経営者が“今”見るための画面
            </div>
          </div>

          <button
            className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
            onClick={async () => {
              setAppliedId(selectedId);
              await loadOverview(selectedId);
            }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <div className="text-sm text-white/70">Accounts:</div>

          <select
            className="rounded-md border border-white/15 bg-black px-3 py-2 text-sm"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="all">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>

          <button
            className="rounded-md border border-white/15 px-3 py-2 text-sm hover:bg-white/5"
            onClick={async () => {
              setAppliedId(selectedId);
              await loadOverview(selectedId);
            }}
            disabled={loading}
          >
            Apply
          </button>

          <div className="ml-auto text-xs text-white/50">
            表示中：{appliedLabel}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-500/40 bg-red-950/20 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="rounded-lg border border-white/15 p-5 text-white/70">
              読み込み中…
            </div>
          ) : (
            <OverviewCard
              data={overview}
              emptyMessage="まだ動きなし（取引データ未登録）"
            />
          )}
        </div>

        <div className="mt-8 text-xs text-white/35">
          ※ ここは“意思決定用”。細かい明細や分析は別画面に逃がす。
        </div>
      </div>
    </div>
  );
}