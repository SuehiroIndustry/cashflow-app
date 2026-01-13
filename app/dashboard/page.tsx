// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  account?: string; // "all" | cash_account_id (number/string)
};

type CashAccount = {
  id: number;
  name: string;
};

type CashFlowRow = {
  id: number;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  cash_account_id: number;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await searchParams) as SearchParams;
  const accountParam = sp.account ?? "all";
  const isAllView = accountParam === "all" || !accountParam;

  const supabase = await createClient();

  // --- auth ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  // --- accounts ---
  // （あなたのスキーマでは cash_accounts が user_id を持ってる前提）
  const { data: accountsData, error: accountsError } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .eq("user_id", user.id)
    .order("id", { ascending: true });

  if (accountsError) {
    // ここで落とすより画面に出した方が楽だけど、まずは確実に止める
    throw new Error(`Failed to load cash_accounts: ${accountsError.message}`);
  }

  const accounts = (accountsData ?? []) as CashAccount[];

  // 選択中の口座ID（数値に寄せる）
  const selectedAccountId = isAllView ? null : Number(accountParam);

  // --- summary (VIEWを捨てて cash_flows を集計) ---
  // cash_flows のRLSが効く前提で、さらに user_id で絞る（安全運転）
  let summaryQuery = supabase
    .from("cash_flows")
    .select("type,amount")
    .eq("user_id", user.id);

  if (selectedAccountId) {
    summaryQuery = summaryQuery.eq("cash_account_id", selectedAccountId);
  }

  const { data: summaryRows, error: summaryError } = await summaryQuery;

  if (summaryError) {
    throw new Error(`Failed to load summary from cash_flows: ${summaryError.message}`);
  }

  const income = (summaryRows ?? [])
    .filter((r: any) => r.type === "income")
    .reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

  const expense = (summaryRows ?? [])
    .filter((r: any) => r.type === "expense")
    .reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);

  const balance = income - expense;

  // --- recent cash flows ---
  let flowsQuery = supabase
    .from("cash_flows")
    .select("id,date,type,amount,currency,description,cash_account_id")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (selectedAccountId) {
    flowsQuery = flowsQuery.eq("cash_account_id", selectedAccountId);
  }

  const { data: flowsData, error: flowsError } = await flowsQuery;

  if (flowsError) {
    throw new Error(`Failed to load cash_flows: ${flowsError.message}`);
  }

  const flows = (flowsData ?? []) as CashFlowRow[];

  // 表示用：口座ID→名前
  const accountNameById = new Map<number, string>();
  for (const a of accounts) accountNameById.set(a.id, a.name);

  // --- sign out (server action) ---
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between mb-8">
          <div>
            <div className="text-xl font-semibold">Cashflow Dashboard</div>
          </div>

          <form action={signOut}>
            <button className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10">
              Logout
            </button>
          </form>
        </header>

        <section className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <div className="text-sm text-white/70">
            Logged in: {user.email ?? user.id}
            <br />
            Account: {isAllView ? "All" : accountNameById.get(selectedAccountId ?? -1) ?? accountParam}
          </div>
        </section>

        <section className="mb-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/70 mb-3">Account filter</div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/dashboard?account=all"
                className={`rounded-full border px-3 py-1 text-sm ${
                  isAllView ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/10"
                }`}
              >
                All
              </a>
              {accounts.map((a) => {
                const active = selectedAccountId === a.id;
                return (
                  <a
                    key={a.id}
                    href={`/dashboard?account=${a.id}`}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      active ? "border-white/40 bg-white/10" : "border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {a.name}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/70 mb-2">Balance</div>
            <div className="text-3xl font-bold">{yen(balance)}</div>
            <div className="text-xs text-white/50 mt-2">via aggregate: cash_flows</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/70 mb-2">Income</div>
            <div className="text-3xl font-bold">{yen(income)}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/70 mb-2">Expense</div>
            <div className="text-3xl font-bold">{yen(expense)}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Cash Flows</div>
            <div className="text-xs text-white/60">Latest: {flows.length} rows (max 100)</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="py-2 text-left font-medium">date</th>
                  <th className="py-2 text-left font-medium">type</th>
                  <th className="py-2 text-right font-medium">amount</th>
                  <th className="py-2 text-left font-medium">description</th>
                  <th className="py-2 text-left font-medium">account</th>
                  <th className="py-2 text-right font-medium">id</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2">{r.date}</td>
                    <td className="py-2">{r.type}</td>
                    <td className="py-2 text-right">{yen(Number(r.amount ?? 0))}</td>
                    <td className="py-2">{r.description ?? ""}</td>
                    <td className="py-2">{accountNameById.get(r.cash_account_id) ?? String(r.cash_account_id)}</td>
                    <td className="py-2 text-right">{r.id}</td>
                  </tr>
                ))}
                {flows.length === 0 && (
                  <tr>
                    <td className="py-6 text-white/60" colSpan={6}>
                      No cash flows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-white/50 mt-3">※ summaryは API を叩かず aggregate で直読み（落ちない設計）</div>
        </section>
      </div>
    </main>
  );
}