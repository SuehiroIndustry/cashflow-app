// app/dashboard/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

type SearchParams = {
  account?: string; // "all" or account_id(uuid)
  month?: string;   // "YYYY-MM"
};

type Txn = {
  id: string;
  user_id: string;
  account_id: string | null;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  category: string | null;
  note: string | null;
  created_at: string;
};

type Account = {
  id: string;
  name: string;
  is_default: boolean | null;
};

type MonthlySummary = {
  account: string;
  month: string; // YYYY-MM-01
  income: number;
  expense: number;
  balance: number;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

function monthInputDefault() {
  // "YYYY-MM"
  return new Date().toISOString().slice(0, 7);
}

function toMonthStart(monthYM: string) {
  // "YYYY-MM" -> "YYYY-MM-01"
  return `${monthYM}-01`;
}

function addOneMonth(monthYM: string) {
  // "YYYY-MM" -> next "YYYY-MM"
  const [y, m] = monthYM.split("-").map((v) => Number(v));
  const d = new Date(Date.UTC(y, (m - 1) + 1, 1));
  return d.toISOString().slice(0, 7);
}

async function baseUrlFromHeaders() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return null;
  return `${proto}://${host}`;
}

async function fetchMonthlySummary(accountParam: string, monthYM: string): Promise<MonthlySummary> {
  const base = await baseUrlFromHeaders();
  if (!base) throw new Error("Failed to resolve base URL from headers");

  const qs = new URLSearchParams();
  qs.set("account", accountParam);
  qs.set("month", monthYM);

  const cookieStore = await cookies();
  const res = await fetch(`${base}/api/monthly-summary?${qs.toString()}`, {
    method: "GET",
    headers: {
      cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to load monthly summary: ${res.status} ${txt}`);
  }

  return (await res.json()) as MonthlySummary;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await searchParams) as SearchParams;
  const supabase = await createClient();

  // ---- auth ----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ---- month ----
  const monthYM = (sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : monthInputDefault());
  const monthStart = toMonthStart(monthYM);
  const nextMonthYM = addOneMonth(monthYM);
  const nextMonthStart = toMonthStart(nextMonthYM);

  // ---- accounts ----
  const { data: accountsRaw, error: accountsErr } = await supabase
    .from("accounts")
    .select("id,name,is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (accountsErr) throw new Error(`Failed to load accounts: ${accountsErr.message}`);
  const accounts = (accountsRaw ?? []) as Account[];

  const isAllView = sp.account === "all" || !sp.account;
  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0] ?? null;

  const filterAccountId = !isAllView && sp.account ? sp.account : null;
  const insertDefaultAccountId = defaultAccount?.id ?? "";

  // ---- server action: insert ----
  async function insertTransaction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const date = String(formData.get("date") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim() as "income" | "expense";
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim() || null;
    const note = String(formData.get("note") ?? "").trim() || null;
    const accountId = String(formData.get("account_id") ?? "").trim();

    if (!accountId) throw new Error("account_id is required");
    if (!date) throw new Error("date is required");
    if (type !== "income" && type !== "expense") throw new Error("type is invalid");

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be a positive number");

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId,
      date,
      type,
      amount,
      category,
      note,
    });

    if (error) throw new Error(`Insert failed: ${error.message}`);

    revalidatePath("/dashboard");
  }

  // ---- monthly summary (via VIEW through API) ----
  const summaryAccountParam = isAllView ? "all" : (filterAccountId ?? "all");
  const monthlySummary = await fetchMonthlySummary(summaryAccountParam, monthYM);

  // ---- transactions (same month, optional account filter) ----
  let txQuery = supabase
    .from("transactions")
    .select("id,user_id,account_id,date,type,amount,category,note,created_at")
    .eq("user_id", user.id)
    .gte("date", monthStart)
    .lt("date", nextMonthStart)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);

  if (filterAccountId) txQuery = txQuery.eq("account_id", filterAccountId);

  const { data: txRaw, error: txErr } = await txQuery;
  if (txErr) throw new Error(`Failed to load transactions: ${txErr.message}`);

  const transactions = (txRaw ?? []) as Txn[];

  const currentAccountLabel =
    isAllView ? "All" : accounts.find((a) => a.id === filterAccountId)?.name ?? "Unknown";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <div className="mt-2 text-sm text-neutral-400">Logged in: {user.email ?? user.id}</div>
        <div className="mt-1 text-sm text-neutral-400">Account: {currentAccountLabel}</div>
        <div className="mt-1 text-sm text-neutral-400">Month: {monthYM}</div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
        <div className="mb-3 text-sm font-medium text-neutral-300">Filters</div>

        {/* month picker (GET) */}
        <form action="/dashboard" method="get" className="flex flex-wrap items-end gap-3">
          {/* keep account */}
          <input type="hidden" name="account" value={isAllView ? "all" : (filterAccountId ?? "all")} />

          <div>
            <label className="block text-xs text-neutral-400">month</label>
            <input
              name="month"
              type="month"
              defaultValue={monthYM}
              className="mt-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            className="inline-flex rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Apply
          </button>
        </form>

        {/* account filter links (preserve month) */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className={`rounded-full border px-3 py-1 text-sm ${
              isAllView ? "border-neutral-200 text-neutral-100" : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
            }`}
            href={`/dashboard?account=all&month=${encodeURIComponent(monthYM)}`}
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
              href={`/dashboard?account=${encodeURIComponent(a.id)}&month=${encodeURIComponent(monthYM)}`}
            >
              {a.name}
              {a.is_default ? " (default)" : ""}
            </a>
          ))}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Balance (Monthly)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(Number(monthlySummary.balance ?? 0))}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Income (Monthly)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(Number(monthlySummary.income ?? 0))}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Expense (Monthly)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(Number(monthlySummary.expense ?? 0))}</div>
        </div>
      </div>

      {/* Add transaction */}
      <div className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 text-lg font-semibold">Add Transaction</div>

        {isAllView && (
          <div className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">
            “All” は表示用。登録する口座を必ず選んでください。
          </div>
        )}

        <form action={insertTransaction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs text-neutral-400">date</label>
            <input
              name="date"
              type="date"
              required
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400">account</label>
            <select
              name="account_id"
              required
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              defaultValue={insertDefaultAccountId}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-400">type</label>
            <select
              name="type"
              required
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              defaultValue="expense"
            >
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-400">amount</label>
            <input
              name="amount"
              type="number"
              inputMode="numeric"
              required
              min={1}
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              placeholder="1000"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400">category</label>
            <input
              name="category"
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              placeholder="food / sales / ..."
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400">note</label>
            <input
              name="note"
              type="text"
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
              placeholder="optional"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="inline-flex rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
              disabled={accounts.length === 0}
              title={accounts.length === 0 ? "No accounts found" : ""}
            >
              Add
            </button>
            <div className="mt-2 text-xs text-neutral-500">● 月次 summary は VIEW 起点（transactions が増えても速い）。</div>
          </div>
        </form>
      </div>

      {/* Transactions (current month) */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Transactions ({monthYM})</div>
          <div className="text-xs text-neutral-500">Rows: {transactions.length} (max 300)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-neutral-400">
              <tr className="border-b border-neutral-800">
                <th className="py-2 text-left font-medium">date</th>
                <th className="py-2 text-left font-medium">type</th>
                <th className="py-2 text-right font-medium">amount</th>
                <th className="py-2 text-left font-medium">category</th>
                <th className="py-2 text-left font-medium">note</th>
                <th className="py-2 text-left font-medium">account_id</th>
                <th className="py-2 text-left font-medium">id</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td className="py-6 text-neutral-500" colSpan={7}>
                    No transactions in this month.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-900">
                    <td className="py-2">{t.date}</td>
                    <td className="py-2">{t.type}</td>
                    <td className="py-2 text-right">{yen(Number(t.amount ?? 0))}</td>
                    <td className="py-2">{t.category ?? ""}</td>
                    <td className="py-2">{t.note ?? ""}</td>
                    <td className="py-2">{t.account_id ?? ""}</td>
                    <td className="py-2">{t.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}