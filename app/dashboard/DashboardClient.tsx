// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type RiskLevel = "GREEN" | "YELLOW" | "RED" | string;

type OverviewPayload = {
  current_balance: number;
  month_income: number;
  month_expense: number;
  net_month: number;

  planned_income_30d: number;
  planned_expense_30d: number;
  net_planned_30d: number;

  projected_balance: number;
  projected_balance_30d: number;

  risk_level: RiskLevel;
  risk_score: number;
  computed_at: string | null;

  debug_rows?: unknown;
};

type AccountRow = {
  id: number;
  name: string;
};

function yen(n: number) {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `¥${Math.trunc(n).toLocaleString("ja-JP")}`;
  }
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(""); // "" = all
  const [appliedAccountId, setAppliedAccountId] = useState<string>(""); // 実際に API に投げてる値

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showDebug, setShowDebug] = useState(false);

  const fetchAccounts = useCallback(async () => {
    // ここは “とりあえず動く” を優先して、存在しそうな cash_accounts を読みに行く。
    // もしテーブル名が違うなら、ここだけ差し替えでOK。
    const { data, error } = await supabase
      .from("cash_accounts")
      .select("id,name")
      .order("id", { ascending: true });

    if (error) {
      // 口座取得に失敗してもダッシュボード自体は動かす
      console.warn("[fetchAccounts] error:", error.message);
      setAccounts([]);
      return;
    }

    const rows: AccountRow[] =
      Array.isArray(data)
        ? data
            .filter((r: any) => r && (typeof r.id === "number" || typeof r.id === "string"))
            .map((r: any) => ({
              id: typeof r.id === "string" ? Number(r.id) : r.id,
              name: typeof r.name === "string" && r.name ? r.name : `Account ${r.id}`,
            }))
        : [];

    setAccounts(rows);
  }, [supabase]);

  const fetchOverview = useCallback(
    async (accountId: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (accountId) params.set("cash_account_id", accountId);
        // デバッグ見たいときだけ 1
        // params.set("debug", "1");

        const res = await fetch(`/api/overview?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (res.status === 401) {
          // セッション切れ等
          router.push("/login");
          return;
        }

        const json = (await res.json()) as any;

        if (!res.ok) {
          const msg = json?.error ? String(json.error) : `HTTP ${res.status}`;
          setError(msg);
          setOverview(null);
          return;
        }

        setOverview(json as OverviewPayload);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Unknown error");
        setOverview(null);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const onApply = useCallback(() => {
    setAppliedAccountId(selectedAccountId);
  }, [selectedAccountId]);

  const onRefresh = useCallback(() => {
    void fetchOverview(appliedAccountId);
  }, [appliedAccountId, fetchOverview]);

  const onLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/login");
  }, [router, supabase]);

  const accountLabel = useMemo(() => {
    if (!appliedAccountId) return "All accounts";
    const idNum = Number(appliedAccountId);
    const found = accounts.find((a) => a.id === idNum);
    return found?.name ?? `Account ${appliedAccountId}`;
  }, [accounts, appliedAccountId]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    // 初期表示
    void fetchOverview(appliedAccountId);
  }, [appliedAccountId, fetchOverview]);

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#000", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Cashflow Dashboard</div>
        <button
          onClick={onLogout}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginTop: 24, fontSize: 14, opacity: 0.85 }}>Cashflow Dashboard</div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ fontSize: 14 }}>
          Accounts:&nbsp;
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onApply}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Apply
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={onRefresh}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 10,
          padding: 14,
          maxWidth: 920,
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 8 }}>
          applied: <b>{accountLabel}</b> {loading ? " (loading...)" : ""}
        </div>

        {error ? (
          <div style={{ color: "#ff8080", whiteSpace: "pre-wrap" }}>{error}</div>
        ) : !overview ? (
          <div style={{ opacity: 0.75 }}>No data.</div>
        ) : (
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 13 }}>
            <div>current_balance: {yen(overview.current_balance)}</div>
            <div>
              month: {yen(overview.month_income)} / {yen(overview.month_expense)}
            </div>
            <div>
              planned(30d): {yen(overview.planned_income_30d)} / {yen(overview.planned_expense_30d)}
            </div>
            <div>projected_balance: {yen(overview.projected_balance)}</div>
            <div>
              risk: {String(overview.risk_level)} (score: {String(overview.risk_score)})
            </div>
            <div>computed_at: {overview.computed_at ?? "(null)"}</div>

            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setShowDebug((v) => !v)}
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                  opacity: 0.9,
                }}
              >
                ▶ Debug (API response)
              </button>
              {showDebug ? (
                <pre
                  style={{
                    marginTop: 8,
                    padding: 10,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    overflowX: "auto",
                    maxHeight: 320,
                  }}
                >
                  {JSON.stringify(overview, null, 2)}
                </pre>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}