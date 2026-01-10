// app/dashboard/page.tsx
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

type SearchParams = {
  account?: string; // "all" | account uuid
};

type TxType = "income" | "expense";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return (
      <main className="p-8">
        <p className="text-sm opacity-80">Not logged in.</p>
        <Link className="underline" href="/login">
          Go to login
        </Link>
      </main>
    );
  }

  // ---- fetch accounts ----
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id,name,is_default,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (accErr) {
    return (
      <main className="p-8">
        <p className="text-sm">Failed to load accounts: {accErr.message}</p>
      </main>
    );
  }

  const defaultAccount =
    accounts?.find((a) => a.is_default) ?? accounts?.[0] ?? null;

  const selectedParam = searchParams.account ?? (defaultAccount?.id ?? "all");
  const selectedAccountId = selectedParam === "all" ? "all" : selectedParam;

  // ---- fetch transactions (account filter applied) ----
  let txQuery = supabase
    .from("transactions")
    .select("id,date,type,amount,category,note,account_id,created_at", {
      count: "exact",
    })
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (selectedAccountId !== "all") {
    txQuery = txQuery.eq("account_id", selectedAccountId);
  }

  const { data: transactions, count: txCount, error: txErr } = await txQuery;

  if (txErr) {
    return (
      <main className="p-8">
        <p className="text-sm">Failed to load transactions: {txErr.message}</p>
      </main>
    );
  }

  // ---- summary (JS reduceで十分) ----
  const income = (transactions ?? [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const expense = (transactions ?? [])
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const balance = income - expense;

  // ---- insert action ----
  async function addTransaction(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const date = String(formData.get("date") ?? "");
    const type = String(formData.get("type") ?? "") as TxType;
    const amountRaw = String(formData.get("amount") ?? "");
    const category = String(formData.get("category") ?? "") || null;
    const note = String(formData.get("note") ?? "") || null;

    // ここが肝：account_id 必須化
    let accountId = String(formData.get("account_id") ?? "");

    // "all" が来たら default に落とす（Allは“表示”用。保存は必ず口座に紐付ける）
    if (!accountId || accountId === "all") {
      // default口座をDBから再取得（server action内は props の accounts を使えない）
      const { data: accs } = await supabase
        .from("accounts")
        .select("id,is_default,is_active")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const def = accs?.find((a) => a.is_default) ?? accs?.[0];
      if (!def?.id) throw new Error("No account found for this user");
      accountId = def.id;
    }

    if (!date) throw new Error("date is required");
    if (type !== "income" && type !== "expense")
      throw new Error("type must be income or expense");

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0)
      throw new Error("amount must be a positive number");

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId, // ✅ 必須
      date,
      type,
      amount,
      category,
      note,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
  }

  const selectedAccountLabel =
    selectedAccountId === "all"
      ? "All"
      : accounts?.find((a) => a.id === selectedAccountId)?.name ?? "Account";

  return (
    <main className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm opacity-80">Logged in: {user.email}</p>
        <p className="mt-1 text-sm opacity-80">Account: {selectedAccountLabel}</p>
      </header>

      {/* Account switcher */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex gap-2">
          <Link
            className={`rounded-full px-3 py-1 text-sm ${
              selectedAccountId === "all" ? "bg-white/15" : "bg-white/5"
            }`}
            href="/dashboard?account=all"
          >
            All
          </Link>

          {(accounts ?? []).map((a) => (
            <Link
              key={a.id}
              className={`rounded-full px-3 py-1 text-sm ${
                selectedAccountId === a.id ? "bg-white/15" : "bg-white/5"
              }`}
              href={`/dashboard?account=${a.id}`}
            >
              {a.name}
              {a.is_default ? " (default)" : ""}
            </Link>
          ))}
        </div>
      </section>

      {/* Summary */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm opacity-70">Balance</div>
          <div className="mt-1 text-2xl font-semibold">
            ¥{balance.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm opacity-70">Income</div>
          <div className="mt-1 text-2xl font-semibold">
            ¥{income.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm opacity-70">Expense</div>
          <div className="mt-1 text-2xl font-semibold">
            ¥{expense.toLocaleString()}
          </div>
        </div>
      </section>

      {/* Add transaction */}
      <section className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Add Transaction</h2>

        <form action={addTransaction} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm opacity-70">date</span>
            <input
              name="date"
              type="date"
              className="rounded-lg bg-black/30 px-3 py-2"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm opacity-70">account</span>
            <select
              name="account_id"
              className="rounded-lg bg-black/30 px-3 py-2"
              defaultValue={selectedAccountId === "all" ? defaultAccount?.id ?? "" : selectedAccountId}
              required
            >
              {(accounts ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
            <span className="text-xs opacity-60">
              ※ 保存時は必ず account_id を transactions に保存します（Allは表示だけ）
            </span>
          </label>

          <label className="grid gap-1">
            <span className="text-sm opacity-70">type</span>
            <select
              name="type"
              className="rounded-lg bg-black/30 px-3 py-2"
              defaultValue="expense"
              required
            >
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm opacity-70">amount</span>
            <input
              name="amount"
              type="number"
              min="1"
              step="1"
              className="rounded-lg bg-black/30 px-3 py-2"
              defaultValue={1000}
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm opacity-70">category</span>
            <input
              name="category"
              type="text"
              className="rounded-lg bg-black/30 px-3 py-2"
              placeholder="food / sales / ..."
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm opacity-70">note</span>
            <input
              name="note"
              type="text"
              className="rounded-lg bg-black/30 px-3 py-2"
              placeholder="optional"
            />
          </label>

          <div className="md:col-span-2">
            <button
              className="rounded-lg bg-white/15 px-4 py-2 text-sm hover:bg-white/20"
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
      </section>

      {/* Transactions */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <div className="text-xs opacity-60">
            Latest: {(transactions ?? []).length} rows (max 200) / total:{" "}
            {txCount ?? "-"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left opacity-70">
              <tr>
                <th className="py-2 pr-3">date</th>
                <th className="py-2 pr-3">type</th>
                <th className="py-2 pr-3">amount</th>
                <th className="py-2 pr-3">category</th>
                <th className="py-2 pr-3">note</th>
                <th className="py-2 pr-3">account_id</th>
                <th className="py-2 pr-3">id</th>
              </tr>
            </thead>
            <tbody>
              {(transactions ?? []).length === 0 ? (
                <tr>
                  <td className="py-4 opacity-60" colSpan={7}>
                    No transactions.
                  </td>
                </tr>
              ) : (
                (transactions ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2 pr-3">{t.date}</td>
                    <td className="py-2 pr-3">{t.type}</td>
                    <td className="py-2 pr-3">
                      ¥{Number(t.amount).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">{t.category ?? ""}</td>
                    <td className="py-2 pr-3">{t.note ?? ""}</td>
                    <td className="py-2 pr-3">{t.account_id ?? ""}</td>
                    <td className="py-2 pr-3">{t.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}