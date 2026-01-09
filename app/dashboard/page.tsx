// app/dashboard/page.tsx
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ✅ ここは君のプロジェクトの実装に合わせて調整してOK
// 例: import { createClient } from "@/utils/supabase/server";
import { createClient } from "@/utils/supabase/server";

type SearchParams = {
  account?: string;
};

function isUuid(v: unknown): v is string {
  if (typeof v !== "string") return false;
  // 雑に UUID 判定（十分）
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await searchParams) as SearchParams;
  const selectedAccountId = sp.account && isUuid(sp.account) ? sp.account : null;

  const supabase = await createClient();

  // --- Auth ---
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/login");
  }

  // --- Accounts（必須テーブル） ---
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id,name,type,currency,is_active,is_default,created_at")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (accErr) {
    throw new Error(`Failed to fetch accounts: ${accErr.message}`);
  }

  const activeAccounts = accounts ?? [];
  const defaultAccountId =
    activeAccounts.find((a) => a.is_default)?.id ?? activeAccounts[0]?.id ?? null;

  // selectedAccountId が変な値なら default に寄せる
  const effectiveAccountId =
    selectedAccountId && activeAccounts.some((a) => a.id === selectedAccountId)
      ? selectedAccountId
      : selectedAccountId
      ? null // URLで変なの渡されたら「全件」に落とす（消すより安全）
      : defaultAccountId; // 初回は default を選択状態にしておくのが自然

  // --- Transactions ---
  // 「口座未選択」= 全件表示（過去データの NULL account_id も含む）
  // 「口座選択」= account_id で絞る（NULL は除外される）
  let txQuery = supabase
    .from("transactions")
    .select("id,user_id,account_id,date,type,amount,category,note,created_at")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (effectiveAccountId) {
    txQuery = txQuery.eq("account_id", effectiveAccountId);
  }

  const { data: transactions, error: txErr } = await txQuery;

  if (txErr) {
    throw new Error(`Failed to fetch transactions: ${txErr.message}`);
  }

  const txs = transactions ?? [];

  // 旧データ（account_id が NULL）がどれだけあるか：全件表示のときに見える
  const { data: nullAccountStats } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("account_id", null);

  const nullAccountCount = nullAccountStats?.length ?? 0;

  // --- Summary（選択口座 or 全体） ---
  // type は 'income' | 'expense' 前提
  const income = txs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const expense = txs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

  const balance = income - expense;

  // --- Server Actions ---
  async function addTransaction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const date = String(formData.get("date") ?? "");
    const type = String(formData.get("type") ?? "");
    const amountRaw = String(formData.get("amount") ?? "");
    const category = String(formData.get("category") ?? "");
    const note = String(formData.get("note") ?? "");
    const accountIdRaw = String(formData.get("account_id") ?? "");

    if (!date) throw new Error("date is required");
    if (type !== "income" && type !== "expense") throw new Error("type is invalid");
    if (!amountRaw) throw new Error("amount is required");

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be > 0");

    // ✅ account_id は必須
    if (!isUuid(accountIdRaw)) throw new Error("account_id is required");

    // ✅ 念のため「その口座が本人のものか」を確認（RLSあっても二重で安全）
    const { data: acc, error: accErr } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", accountIdRaw)
      .eq("user_id", user.id)
      .maybeSingle();

    if (accErr || !acc) throw new Error("invalid account");

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountIdRaw,
      date,
      type,
      amount,
      category: category || null,
      note: note || null,
    });

    if (error) {
      throw new Error(`insert failed: ${error.message}`);
    }

    // 口座選択してたら、その口座の画面に戻すと気持ちいい
    revalidatePath("/dashboard");
  }

  async function deleteTransaction(formData: FormData) {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const id = String(formData.get("id") ?? "");
    if (!isUuid(id)) throw new Error("invalid id");

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(`delete failed: ${error.message}`);

    revalidatePath("/dashboard");
  }

  // --- UI helpers ---
  const accountLabel = (id: string | null) => {
    if (!id) return "All accounts";
    const a = activeAccounts.find((x) => x.id === id);
    return a ? a.name : "All accounts";
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <p className="mt-2 text-sm text-white/70">Logged in: {user.email}</p>
            <p className="mt-1 text-sm text-white/70">
              Account: <span className="text-white">{accountLabel(effectiveAccountId)}</span>
            </p>
          </div>

          <form
            action={async () => {
              "use server";
              const supabase = await createClient();
              await supabase.auth.signOut();
              redirect("/login");
            }}
          >
            <button className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
              Sign out
            </button>
          </form>
        </div>

        {/* Account Switch UI */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/dashboard"
              className={[
                "rounded-full border px-3 py-1 text-sm",
                !effectiveAccountId ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/10",
              ].join(" ")}
            >
              All
            </a>

            {activeAccounts.map((a) => {
              const active = a.id === effectiveAccountId;
              return (
                <a
                  key={a.id}
                  href={`/dashboard?account=${a.id}`}
                  className={[
                    "rounded-full border px-3 py-1 text-sm",
                    active ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/10",
                  ].join(" ")}
                  title={`${a.type} / ${a.currency}`}
                >
                  {a.name}
                  {a.is_default ? " (default)" : ""}
                </a>
              );
            })}
          </div>

          {!effectiveAccountId && nullAccountCount > 0 && (
            <p className="mt-3 text-xs text-amber-300/90">
              ⚠ account_id が NULL の古い取引が {nullAccountCount} 件あります。口座別で集計したいなら、
              “Cash” など default 口座に移すUPDATEを一回打つのが吉。
            </p>
          )}

          {effectiveAccountId && !activeAccounts.some((a) => a.id === effectiveAccountId) && (
            <p className="mt-3 text-xs text-amber-300/90">
              ⚠ 指定された口座が見つからないので “All” 表示にしています。
            </p>
          )}
        </section>

        {/* Summary Cards */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Balance</div>
            <div className="mt-2 text-2xl font-semibold">{yen(balance)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Income</div>
            <div className="mt-2 text-2xl font-semibold">{yen(income)}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Expense</div>
            <div className="mt-2 text-2xl font-semibold">{yen(expense)}</div>
          </div>
        </section>

        {/* Add Transaction */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold">Add Transaction</h2>

          <form action={addTransaction} className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-white/60">date</label>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/60">account</label>
              <select
                name="account_id"
                defaultValue={effectiveAccountId ?? defaultAccountId ?? ""}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
                required
              >
                {activeAccounts.length === 0 && <option value="">(no accounts)</option>}
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-white/40">
                ※ ここで選んだ口座の account_id を transactions に必ず保存します。
              </p>
            </div>

            <div>
              <label className="block text-xs text-white/60">type</label>
              <select
                name="type"
                defaultValue="expense"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
                required
              >
                <option value="expense">expense</option>
                <option value="income">income</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/60">amount</label>
              <input
                name="amount"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="1000"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-white/60">category</label>
              <input
                name="category"
                type="text"
                placeholder="food / sales / ..."
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60">note</label>
              <input
                name="note"
                type="text"
                placeholder="optional"
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div className="md:col-span-2">
              <button className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
                Add
              </button>
              <p className="mt-3 text-xs text-white/40">
                ※ まずは insert→select→update→delete が通ることを確認。見た目は後でいじる。
              </p>
            </div>
          </form>
        </section>

        {/* Transactions */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold">Transactions</h2>
            <p className="text-xs text-white/50">Latest: {txs.length} rows (max 200)</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs text-white/60">
                  <th className="border-b border-white/10 px-3 py-2">date</th>
                  <th className="border-b border-white/10 px-3 py-2">type</th>
                  <th className="border-b border-white/10 px-3 py-2">amount</th>
                  <th className="border-b border-white/10 px-3 py-2">category</th>
                  <th className="border-b border-white/10 px-3 py-2">note</th>
                  <th className="border-b border-white/10 px-3 py-2">account_id</th>
                  <th className="border-b border-white/10 px-3 py-2">id</th>
                  <th className="border-b border-white/10 px-3 py-2">action</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id} className="text-white/90">
                    <td className="border-b border-white/10 px-3 py-3">{t.date}</td>
                    <td className="border-b border-white/10 px-3 py-3">{t.type}</td>
                    <td className="border-b border-white/10 px-3 py-3">
                      {yen(Number(t.amount ?? 0))}
                    </td>
                    <td className="border-b border-white/10 px-3 py-3">
                      {t.category ?? ""}
                    </td>
                    <td className="border-b border-white/10 px-3 py-3">
                      {t.note ?? ""}
                    </td>
                    <td className="border-b border-white/10 px-3 py-3">
                      <span className={t.account_id ? "text-white/70" : "text-amber-300/90"}>
                        {t.account_id ?? "NULL"}
                      </span>
                    </td>
                    <td className="border-b border-white/10 px-3 py-3 text-white/60">
                      {t.id}
                    </td>
                    <td className="border-b border-white/10 px-3 py-3">
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="rounded-md border border-white/15 px-2 py-1 text-xs hover:bg-white/10">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}

                {txs.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-sm text-white/50" colSpan={8}>
                      No transactions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}