// app/dashboard/page.tsx
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type SearchParams = {
  account?: string; // "all" | <uuid>
};

type Account = {
  id: string;
  name: string | null;
  is_default: boolean | null;
  created_at?: string;
};

type TxType = "income" | "expense";

type Transaction = {
  id: string;
  user_id: string;
  account_id: string | null;
  date: string; // YYYY-MM-DD
  type: TxType;
  amount: number;
  category: string | null;
  note: string | null;
  created_at: string;
};

function yen(n: number) {
  const v = Math.trunc(Number.isFinite(n) ? n : 0);
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(v);
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

  if (userErr || !user) redirect("/login");

  const selectedAccountParam = (searchParams?.account ?? "all").trim();
  const isAll = selectedAccountParam === "" || selectedAccountParam === "all";
  const selectedAccountId = isAll ? null : selectedAccountParam;

  // ---- Fetch accounts (for account switch UI + insert default)
  const { data: accountsRaw, error: accountsErr } = await supabase
    .from("accounts")
    .select("id,name,is_default,created_at")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (accountsErr) {
    // accounts テーブルがまだ無い/権限不足のときも落とさず表示だけはさせる
    // 必要ならここで throw してもOK
  }

  const accounts: Account[] = (accountsRaw ?? []) as Account[];
  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0] ?? null;

  // ---- Fetch transactions (filtered by account if selected)
  let txQuery = supabase
    .from("transactions")
    .select("id,user_id,account_id,date,type,amount,category,note,created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (selectedAccountId) {
    txQuery = txQuery.eq("account_id", selectedAccountId);
  }

  const { data: txRaw, error: txErr } = await txQuery;

  const transactions: Transaction[] = (txRaw ?? []) as Transaction[];

  // ---- Summary (income/expense/balance)
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const balance = income - expense;

  // ---- Server Actions
  async function addTransaction(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const date = String(formData.get("date") ?? "").trim() || todayISO();
    const type = String(formData.get("type") ?? "expense") as TxType;
    const amount = Number(String(formData.get("amount") ?? "0").trim());
    const category = String(formData.get("category") ?? "").trim() || null;
    const note = String(formData.get("note") ?? "").trim() || null;

    // ★ここが Step2 の本丸：account_id を必須にする
    const account_id = String(formData.get("account_id") ?? "").trim();

    if (!account_id) {
      // UIで選べるのに空なら、フォーム/名前不一致か hidden が壊れてる
      throw new Error("account_id is required (form name mismatch or missing selection).");
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id,
      date,
      type,
      amount,
      category,
      note,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
  }

  async function deleteTransaction(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
  }

  // ---- UI helpers
  const selectedAccountLabel =
    isAll ? "All" : accounts.find((a) => a.id === selectedAccountId)?.name ?? "Unknown";

  const insertDefaultAccountId = selectedAccountId ?? defaultAccount?.id ?? "";

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <div className="mt-2 text-sm text-zinc-400">
              Logged in: <span className="text-zinc-200">{user.email}</span>
              <div className="mt-1">
                Account: <span className="text-zinc-200">{selectedAccountLabel}</span>
              </div>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm hover:bg-zinc-900">
              Sign out
            </button>
          </form>
        </div>

        {/* Account Switch */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm text-zinc-300">Account filter</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard?account=all"
              className={[
                "rounded-full border px-3 py-1 text-sm",
                isAll
                  ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
              ].join(" ")}
            >
              All
            </Link>

            {accounts.map((a) => {
              const active = a.id === selectedAccountId;
              const label = `${a.name ?? "Untitled"}${a.is_default ? " (default)" : ""}`;
              return (
                <Link
                  key={a.id}
                  href={`/dashboard?account=${encodeURIComponent(a.id)}`}
                  className={[
                    "rounded-full border px-3 py-1 text-sm",
                    active
                      ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                      : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {accountsErr ? (
            <div className="mt-3 text-xs text-amber-400">
              accounts の取得でエラー：{accountsErr.message}
            </div>
          ) : null}
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-xs text-zinc-400">Balance</div>
            <div className="mt-2 text-2xl font-semibold">{yen(balance)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-xs text-zinc-400">Income</div>
            <div className="mt-2 text-2xl font-semibold">{yen(income)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-xs text-zinc-400">Expense</div>
            <div className="mt-2 text-2xl font-semibold">{yen(expense)}</div>
          </div>
        </div>

        {/* Add Transaction */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="text-lg font-semibold">Add Transaction</div>

          <form action={addTransaction} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-400">date</label>
              <input
                name="date"
                type="date"
                defaultValue={todayISO()}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400">account</label>
              <select
                name="account_id"
                defaultValue={insertDefaultAccountId}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>
                  Select an account
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? "Untitled"}
                    {a.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-zinc-500">
                ※ ここで選んだ口座の <span className="text-zinc-300">account_id</span> を transactions に必ず保存します。
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400">type</label>
              <select
                name="type"
                defaultValue="expense"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
              >
                <option value="income">income</option>
                <option value="expense">expense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-zinc-400">amount</label>
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                placeholder="1000"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400">category</label>
              <input
                name="category"
                type="text"
                placeholder="food / sales / ..."
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400">note</label>
              <input
                name="note"
                type="text"
                placeholder="optional"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800">
                Add
              </button>
              <div className="mt-2 text-xs text-zinc-500">
                ※ まずは insert→select→update→delete が通ることを確認。見た目は後でいい。
              </div>
            </div>
          </form>
        </div>

        {/* Transactions */}
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-end justify-between gap-4">
            <div className="text-lg font-semibold">Transactions</div>
            <div className="text-xs text-zinc-500">Latest: {transactions.length} rows (max 200)</div>
          </div>

          {txErr ? (
            <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
              transactions の取得でエラー：{txErr.message}
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400">
                  <th className="py-2 pr-4">date</th>
                  <th className="py-2 pr-4">type</th>
                  <th className="py-2 pr-4">amount</th>
                  <th className="py-2 pr-4">category</th>
                  <th className="py-2 pr-4">note</th>
                  <th className="py-2 pr-4">account_id</th>
                  <th className="py-2 pr-4">id</th>
                  <th className="py-2 pr-0">action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td className="py-4 text-zinc-500" colSpan={8}>
                      No transactions.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="border-b border-zinc-900">
                      <td className="py-3 pr-4 text-zinc-200">{t.date}</td>
                      <td className="py-3 pr-4 text-zinc-200">{t.type}</td>
                      <td className="py-3 pr-4 text-zinc-200">{yen(Number(t.amount || 0))}</td>
                      <td className="py-3 pr-4 text-zinc-300">{t.category ?? ""}</td>
                      <td className="py-3 pr-4 text-zinc-300">{t.note ?? ""}</td>
                      <td className="py-3 pr-4 text-zinc-400">{t.account_id ?? "NULL"}</td>
                      <td className="py-3 pr-4 text-zinc-500">{t.id}</td>
                      <td className="py-3 pr-0">
                        <form action={deleteTransaction}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="rounded-md border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-900">
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* tiny debug hint */}
          {!insertDefaultAccountId ? (
            <div className="mt-4 text-xs text-amber-400">
              account_id の選択肢が空です。accounts が0件か、RLS/取得が失敗しています。
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}