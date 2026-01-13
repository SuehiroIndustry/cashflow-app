// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  account?: string; // "all" | cash_account_id
};

type CashAccount = {
  id: number;
  name: string;
};

type CashFlowRow = {
  id: number;
  cash_account_id: number;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  currency: string | null;
  source_type: string | null;
  description: string | null;
  cash_category_id: number | null;
  created_at: string;
};

type Summary = {
  account: string | null;
  income: number;
  expense: number;
  balance: number;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

function getBaseUrlFromHeaders(h: Headers) {
  // Vercel/ローカル両対応（envがあれば最優先）
  const envBase =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL;

  if (envBase) {
    const withProto = envBase.startsWith("http") ? envBase : `https://${envBase}`;
    return withProto.replace(/\/$/, "");
  }

  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`.replace(/\/$/, "");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = searchParams ?? {};
  const supabase = await createClient();

  // ---- auth ----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ---- accounts ----
  const { data: accountsRaw, error: accountsErr } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (accountsErr) {
    throw new Error(`Failed to load cash_accounts: ${accountsErr.message}`);
  }

  const accounts = (accountsRaw ?? []) as CashAccount[];

  const isAllView = !sp.account || sp.account === "all";
  const filterAccountId = !isAllView ? Number(sp.account) : null;

  const currentAccountLabel = isAllView
    ? "All"
    : accounts.find((a) => a.id === filterAccountId)?.name ?? "Unknown";

  // ---- summary (API経由: app/api/summary/route.ts) ----
  const h = headers();
  const baseUrl = getBaseUrlFromHeaders(h);

  const summaryUrl = new URL("/api/summary", baseUrl);
  summaryUrl.searchParams.set("account", isAllView ? "all" : String(filterAccountId ?? "all"));

  const summaryRes = await fetch(summaryUrl.toString(), { cache: "no-store" });
  if (!summaryRes.ok) {
    const body = await summaryRes.text().catch(() => "");
    throw new Error(`Failed to load summary: ${summaryRes.status} ${body}`);
  }
  const summary = (await summaryRes.json()) as Summary;

  // ---- recent cash flows ----
  let q = supabase
    .from("cash_flows")
    .select(
      "id,cash_account_id,date,type,amount,currency,source_type,description,cash_category_id,created_at"
    )
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (filterAccountId) {
    q = q.eq("cash_account_id", filterAccountId);
  }

  const { data: flowsRaw, error: flowsErr } = await q;

  if (flowsErr) {
    throw new Error(`Failed to load cash_flows: ${flowsErr.message}`);
  }

  const flows = (flowsRaw ?? []) as CashFlowRow[];

  // ---- UI ----
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <div className="mt-2 text-sm text-neutral-400">Logged in: {user.email ?? user.id}</div>
        <div className="mt-1 text-sm text-neutral-400">Account: {currentAccountLabel}</div>
      </div>

      {/* Account filter */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
        <div className="mb-3 text-sm font-medium text-neutral-300">Account filter</div>
        <div className="flex flex-wrap gap-2">
          <a
            className={`rounded-full border px-3 py-1 text-sm ${
              isAllView
                ? "border-neutral-200 text-neutral-100"
                : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
            href="/dashboard?account=all"
          >
            All
          </a>
          {accounts.map((a) => (
            <a
              key={a.id}
              className={`rounded-full border px-3 py-1 text-sm ${
                !isAllView && filterAccountId === a.id
                  ? "border-neutral-200 text-neutral-100"
                  : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
              href={`/dashboard?account=${encodeURIComponent(String(a.id))}`}
            >
              {a.name}
            </a>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Balance</div>
          <div className="mt-2 text-2xl font-semibold">{yen(Number(summary.balance ?? 0))}</div>
          <div className="mt-1 text-xs text-neutral-500">via /api/summary</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Income</div>
          <div className="mt-2 text-2xl font-semibold">{yen(Number(summary.income ?? 0))}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Expense</div>
          <div className="mt-2 text-2xl font-semibold">{yen(Number(summary.expense ?? 0))}</div>
        </div>
      </div>

      {/* Cash flows */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Cash Flows</div>
          <div className="text-xs text-neutral-500">Latest: {flows.length} rows (max 100)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-400">
              <tr className="border-b border-neutral-800">
                <th className="py-2 text-left font-medium">date</th>
                <th className="py-2 text-left font-medium">type</th>
                <th className="py-2 text-right font-medium">amount</th>
                <th className="py-2 text-left font-medium">description</th>
                <th className="py-2 text-left font-medium">account_id</th>
                <th className="py-2 text-left font-medium">id</th>
              </tr>
            </thead>
            <tbody>
              {flows.length === 0 ? (
                <tr>
                  <td className="py-6 text-neutral-500" colSpan={6}>
                    No cash flows.
                  </td>
                </tr>
              ) : (
                flows.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-900">
                    <td className="py-2">{r.date}</td>
                    <td className="py-2">{r.type}</td>
                    <td className="py-2 text-right">{yen(Number(r.amount ?? 0))}</td>
                    <td className="py-2">{r.description ?? ""}</td>
                    <td className="py-2">{r.cash_account_id}</td>
                    <td className="py-2">{r.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-xs text-neutral-500">
          ※ 追加登録は次のステップで <code>public.add_cash_flow()</code> 経由に戻す（制約を安全に満たすため）
        </div>
      </div>
    </div>
  );
}