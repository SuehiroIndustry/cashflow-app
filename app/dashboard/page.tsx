// app/dashboard/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type SearchParams = {
  account?: string; // "all" or account_id(uuid)
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

type BalanceRow = {
  user_id: string;
  account_id: string;
  income: number | null;
  expense: number | null;
  balance: number | null;
};

type MonthlyRowUser = {
  user_id: string;
  month: string; // YYYY-MM-DD (date)
  income: number | null;
  expense: number | null;
  balance: number | null;
};

type MonthlyRowAccount = {
  user_id: string;
  account_id: string;
  month: string; // YYYY-MM-DD (date)
  income: number | null;
  expense: number | null;
  balance: number | null;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

function monthStartISO(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10); // YYYY-MM-DD
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

  // ---- summary (VIEW: account_balances) ----
  let balQ = supabase
    .from("account_balances")
    .select("user_id,account_id,income,expense,balance")
    .eq("user_id", user.id);

  if (filterAccountId) balQ = balQ.eq("account_id", filterAccountId);

  const { data: balRaw, error: balErr } = await balQ;
  if (balErr) throw new Error(`Failed to load balances(view): ${balErr.message}`);

  const balRows = (balRaw ?? []) as BalanceRow[];

  const incomeTotal = balRows.reduce((s, r) => s + Number(r.income ?? 0), 0);
  const expenseTotal = balRows.reduce((s, r) => s + Number(r.expense ?? 0), 0);
  const balanceTotal = balRows.reduce((s, r) => s + Number(r.balance ?? 0), 0);

  // ---- monthly (VIEW) ----
  const thisMonth = monthStartISO();

  // 今月1行（Allなら user view / 特定なら account view）
  let monthIncome = 0;
  let monthExpense = 0;
  let monthBalance = 0;

  if (isAllView) {
    const { data, error } = await supabase
      .from("monthly_user_balances")
      .select("user_id,month,income,expense,balance")
      .eq("user_id", user.id)
      .eq("month", thisMonth)
      .limit(1);

    if (error) throw new Error(`Failed to load monthly_user_balances: ${error.message}`);

    const row = (data?.[0] ?? null) as MonthlyRowUser | null;
    monthIncome = Number(row?.income ?? 0);
    monthExpense = Number(row?.expense ?? 0);
    monthBalance = Number(row?.balance ?? 0);
  } else {
    const { data, error } = await supabase
      .from("monthly_account_balances")
      .select("user_id,account_id,month,income,expense,balance")
      .eq("user_id", user.id)
      .eq("account_id", filterAccountId!)
      .eq("month", thisMonth)
      .limit(1);

    if (error) throw new Error(`Failed to load monthly_account_balances: ${error.message}`);

    const row = (data?.[0] ?? null) as MonthlyRowAccount | null;
    monthIncome = Number(row?.income ?? 0);
    monthExpense = Number(row?.expense ?? 0);
    monthBalance = Number(row?.balance ?? 0);
  }

  // 直近6ヶ月（Allなら user view / 特定なら account view）
  const trendLimit = 6;
  let monthlyTrend: Array<{ month: string; income: number; expense: number; balance: number }> = [];

  if (isAllView) {
    const { data, error } = await supabase
      .from("monthly_user_balances")
      .select("month,income,expense,balance")
      .eq("user_id", user.id)
      .order("month", { ascending: false })
      .limit(trendLimit);

    if (error) throw new Error(`Failed to load monthly trend (user): ${error.message}`);

    monthlyTrend = (data ?? []).map((r: any) => ({
      month: String(r.month),
      income: Number(r.income ?? 0),
      expense: Number(r.expense ?? 0),
      balance: Number(r.balance ?? 0),
    }));
  } else {
    const { data, error } = await supabase
      .from("monthly_account_balances")
      .select("month,income,expense,balance")
      .eq("user_id", user.id)
      .eq("account_id", filterAccountId!)
      .order("month", { ascending: false })
      .limit(trendLimit);

    if (error) throw new Error(`Failed to load monthly trend (account): ${error.message}`);

    monthlyTrend = (data ?? []).map((r: any) => ({
      month: String(r.month),
      income: Number(r.income ?? 0),
      expense: Number(r.expense ?? 0),
      balance: Number(r.balance ?? 0),
    }));
  }

  // ---- transactions ----
  let txQuery = supabase
    .from("transactions")
    .select("id,user_id,account_id,date,type,amount,category,note,created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterAccountId) txQuery = txQuery.eq("account_id", filterAccountId);

  const { data: txRaw, error: txErr } = await txQuery;
  if (txErr) throw new Error(`Failed to load transactions: ${txErr.message}`);

  const transactions = (txRaw ?? []) as Txn[];

  // ---- UI ----
  const currentAccountLabel =
    isAllView ? "All" : accounts.find((a) => a.id === filterAccountId)?.name ?? "Unknown";

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
              href={`/dashboard?account=${encodeURIComponent(a.id)}`}
            >
              {a.name}
              {a.is_default ? " (default)" : ""}
            </a>
          ))}
        </div>
      </div>

      {/* Total Summary (VIEW参照) */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Balance (Total)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(balanceTotal)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Income (Total)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(incomeTotal)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Expense (Total)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(expenseTotal)}</div>
        </div>
      </div>

      {/* Monthly Summary (VIEW参照) */}
      <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <div className="text-lg font-semibold">This Month</div>
            <div className="text-xs text-neutral-500">month = {thisMonth}</div>
          </div>
          <div className="text-xs text-neutral-500">
            source: {isAllView ? "monthly_user_balances" : "monthly_account_balances"}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-xs text-neutral-400">Income (This Month)</div>
            <div className="mt-2 text-2xl font-semibold">{yen(monthIncome)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-xs text-neutral-400">Expense (This Month)</div>
            <div className="mt-2 text-2xl font-semibold">{yen(monthExpense)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
            <div className="text-xs text-neutral-400">Balance (This Month)</div>
            <div className="mt-2 text-2xl font-semibold">{yen(monthBalance)}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-sm font-medium text-neutral-300">Last {trendLimit} months</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-neutral-400">
                <tr className="border-b border-neutral-800">
                  <th className="py-2 text-left font-medium">month</th>
                  <th className="py-2 text-right font-medium">income</th>
                  <th className="py-2 text-right font-medium">expense</th>
                  <th className="py-2 text-right font-medium">balance</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrend.length === 0 ? (
                  <tr>
                    <td className="py-4 text-neutral-500" colSpan={4}>
                      No monthly data yet.
                    </td>
                  </tr>
                ) : (
                  monthlyTrend.map((r) => (
                    <tr key={r.month} className="border-b border-neutral-900">
                      <td className="py-2">{r.month}</td>
                      <td className="py-2 text-right">{yen(r.income)}</td>
                      <td className="py-2 text-right">{yen(r.expense)}</td>
                      <td className="py-2 text-right">{yen(r.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add transaction */}
      <div className="mb-10 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 text-lg font-semibold">Add Transaction</div>

        {isAllView && (
          <div className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-200">
            “All” は表示用です。登録する口座を必ず選んでください（選んだ口座の account_id で保存されます）。
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
            <div className="mt-1 text-xs text-neutral-500">
              ※ここで選んだ口座の <code>account_id</code> を transactions に必ず保存します。
            </div>
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
            <div className="mt-2 text-xs text-neutral-500">
              ● insert → VIEW（月次含む） → 表示、の流れが繋がれば勝ち。UIは後で殴ればいい。
            </div>
          </div>
        </form>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Transactions</div>
          <div className="text-xs text-neutral-500">Latest: {transactions.length} rows (max 200)</div>
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
                    No transactions.
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