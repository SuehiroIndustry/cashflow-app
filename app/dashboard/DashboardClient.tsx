// app/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type CashAccountRow = {
  id: string;
  name: string;
};

type CashFlowRow = {
  id: number;
  cash_account_id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  cash_category_id: number | null;
  created_at: string;
};

type Summary = {
  account: "all" | string | null;
  income: number;
  expense: number;
  balance: number;
};

export default function DashboardClient(props: {
  userEmail: string;
  accounts: CashAccountRow[];
  initialFlows: CashFlowRow[];
}) {
  const { userEmail, accounts, initialFlows } = props;

  const supabase = useMemo(() => createClient(), []);
  const [selectedAccountId, setSelectedAccountId] = useState<string | "all">(
    "all"
  );

  const [summary, setSummary] = useState<Summary>({
    account: "all",
    income: 0,
    expense: 0,
    balance: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const accountNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) m.set(a.id, a.name);
    return m;
  }, [accounts]);

  const accountLabel = useMemo(() => {
    if (selectedAccountId === "all") return "All";
    return accountNameById.get(selectedAccountId) ?? selectedAccountId;
  }, [selectedAccountId, accountNameById]);

  const filteredFlows = useMemo(() => {
    if (selectedAccountId === "all") return initialFlows;
    return initialFlows.filter((f) => f.cash_account_id === selectedAccountId);
  }, [initialFlows, selectedAccountId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setSummaryLoading(true);
      setSummaryError(null);

      try {
        const url = new URL("/api/summary", window.location.origin);
        url.searchParams.set(
          "account",
          selectedAccountId === "all" ? "all" : selectedAccountId
        );

        const res = await fetch(url.toString(), {
          method: "GET",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });

        const json = await res.json();

        if (!res.ok) {
          const msg =
            typeof json?.error === "string"
              ? json.error
              : `Failed to fetch summary (${res.status})`;
          throw new Error(msg);
        }

        if (!cancelled) {
          setSummary({
            account: json.account ?? (selectedAccountId === "all" ? "all" : selectedAccountId),
            income: Number(json.income ?? 0),
            expense: Number(json.expense ?? 0),
            balance: Number(json.balance ?? 0),
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setSummary({
            account: selectedAccountId === "all" ? "all" : selectedAccountId,
            income: 0,
            expense: 0,
            balance: 0,
          });
          setSummaryError(e?.message ?? "Unknown error");
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  const yen = (n: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);

  async function onLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>
        </div>
        <button
          onClick={onLogout}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        >
          Logout
        </button>
      </header>

      <section className="mt-10 max-w-5xl mx-auto">
        <div className="mb-4">
          <h2 className="text-3xl font-semibold">Dashboard</h2>
          <div className="mt-2 text-sm text-white/60">
            <div>Logged in: {userEmail}</div>
            <div>Account: {accountLabel}</div>
          </div>
        </div>

        {/* Account filter */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-white/60 mb-3">Account filter</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedAccountId("all")}
              className={[
                "rounded-full border px-3 py-1 text-sm",
                selectedAccountId === "all"
                  ? "border-white/40 bg-white/10"
                  : "border-white/10 bg-transparent hover:bg-white/5",
              ].join(" ")}
            >
              All
            </button>

            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAccountId(a.id)}
                className={[
                  "rounded-full border px-3 py-1 text-sm",
                  selectedAccountId === a.id
                    ? "border-white/40 bg-white/10"
                    : "border-white/10 bg-transparent hover:bg-white/5",
                ].join(" ")}
                title={a.id}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/60">Balance</div>
            <div className="mt-2 text-3xl font-semibold">
              {summaryLoading ? "…" : yen(summary.balance)}
            </div>
            <div className="mt-2 text-xs text-white/40">
              via API: /api/summary
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/60">Income</div>
            <div className="mt-2 text-3xl font-semibold">
              {summaryLoading ? "…" : yen(summary.income)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/60">Expense</div>
            <div className="mt-2 text-3xl font-semibold">
              {summaryLoading ? "…" : yen(summary.expense)}
            </div>
          </div>
        </div>

        {summaryError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Summary error: {summaryError}
          </div>
        )}

        {/* Cash flows */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Cash Flows</h3>
            <div className="text-xs text-white/50">
              Latest: {filteredFlows.length} rows (max 100)
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="py-2 text-left font-medium">date</th>
                  <th className="py-2 text-left font-medium">type</th>
                  <th className="py-2 text-right font-medium">amount</th>
                  <th className="py-2 text-left font-medium">description</th>
                  <th className="py-2 text-left font-medium">account_id</th>
                  <th className="py-2 text-right font-medium">id</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlows.map((f) => (
                  <tr key={f.id} className="border-b border-white/5">
                    <td className="py-2">{f.date}</td>
                    <td className="py-2">{f.type}</td>
                    <td className="py-2 text-right">
                      {yen(Number(f.amount ?? 0))}
                    </td>
                    <td className="py-2">
                      {f.description ?? ""}
                    </td>
                    <td className="py-2">{f.cash_account_id}</td>
                    <td className="py-2 text-right">{f.id}</td>
                  </tr>
                ))}
                {filteredFlows.length === 0 && (
                  <tr>
                    <td className="py-6 text-white/50" colSpan={6}>
                      No rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-white/40">
            ※ summaryは API を叩いて view を読む設計（重くしない）
          </div>
        </div>
      </section>
    </main>
  );
}