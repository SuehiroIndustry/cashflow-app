// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Tx = {
  id: string;
  date: string; // YYYY-MM-DD
  type: "income" | "expense";
  amount: number;
  category: string | null;
  memo: string | null;
};

function formatJPY(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ---- Server Actions ----
  async function addTransaction(formData: FormData) {
    "use server";
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const date = String(formData.get("date") ?? "").trim(); // "2026-01-09"
    const type = String(formData.get("type") ?? "").trim() as "income" | "expense";
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const memo = String(formData.get("memo") ?? "").trim();

    const amount = Number(amountRaw);

    // 最低限のバリデーション（雑でOK。壊れないこと優先）
    if (!date) throw new Error("date is required");
    if (type !== "income" && type !== "expense") throw new Error("invalid type");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("amount must be > 0");

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id, // RLSのため明示して入れる
      date,
      type,
      amount: Math.trunc(amount),
      category: category || null,
      memo: memo || null,
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

    // 念のため user_id も条件に入れて二重ロック
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
  }

  // ---- Data Fetch (SSR) ----
  const { data: txsRaw, error } = await supabase
    .from("transactions")
    .select("id, date, type, amount, category, memo")
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    // ここで落とすと見づらいので画面上に出す
    // eslint-disable-next-line no-console
    console.error("select transactions error:", error);
  }

  const txs: Tx[] = (txsRaw ?? []) as Tx[];

  // ① 残高（income = +, expense = -）
  const balance = txs.reduce((sum, t) => {
    const a = Number(t.amount) || 0;
    return sum + (t.type === "income" ? a : -a);
  }, 0);

  const incomeTotal = txs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const expenseTotal = txs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="mt-2 text-sm text-white/70">
            Logged in: <span className="text-white">{user.email}</span>
          </div>
          <form action="/auth/signout" method="post" className="mt-3">
            <button
              className="rounded-md border border-white/20 px-3 py-1 text-sm hover:bg-white/10"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </header>

        {/* ① 残高カード */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">Balance</div>
            <div className="mt-1 text-2xl font-bold">{formatJPY(balance)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">Income</div>
            <div className="mt-1 text-xl font-semibold">{formatJPY(incomeTotal)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/60">Expense</div>
            <div className="mt-1 text-xl font-semibold">{formatJPY(expenseTotal)}</div>
          </div>
        </section>

        {/* 追加フォーム */}
        <section className="mb-10 rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold">Add Transaction</h2>

          <form action={addTransaction} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-white/70">date</span>
              <input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/30"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-white/70">type</span>
              <select
                name="type"
                defaultValue="expense"
                className="rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/30"
              >
                <option value="income">income</option>
                <option value="expense">expense</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-white/70">amount</span>
              <input
                name="amount"
                type="number"
                min={1}
                step={1}
                placeholder="1000"
                className="rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/30"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-white/70">category</span>
              <input
                name="category"
                placeholder="food / sales / ..."
                className="rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/30"
              />
            </label>

            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-white/70">memo</span>
              <input
                name="memo"
                placeholder="optional"
                className="rounded-md border border-white/10 bg-black px-3 py-2 text-white outline-none focus:border-white/30"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Add
              </button>
              <p className="mt-2 text-xs text-white/50">
                ※まずは insert→select が通ることを確認。見た目は後でいじる。
              </p>
            </div>
          </form>
        </section>

        {/* 一覧 */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold">Transactions</h2>

          {error ? (
            <p className="text-sm text-red-400">Select error: {error.message}</p>
          ) : txs.length === 0 ? (
            <p className="text-sm text-white/70">まだデータがありません（空でOK）。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="text-white/70">
                  <tr className="border-b border-white/10">
                    <th className="py-2 text-left font-medium">date</th>
                    <th className="py-2 text-left font-medium">type</th>
                    <th className="py-2 text-right font-medium">amount</th>
                    <th className="py-2 text-left font-medium">category</th>
                    <th className="py-2 text-left font-medium">memo</th>
                    <th className="py-2 text-left font-medium">id</th>
                    <th className="py-2 text-right font-medium">action</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id} className="border-b border-white/5">
                      <td className="py-2">{t.date}</td>
                      <td className="py-2">{t.type}</td>
                      <td className="py-2 text-right">{formatJPY(Number(t.amount) || 0)}</td>
                      <td className="py-2">{t.category ?? ""}</td>
                      <td className="py-2">{t.memo ?? ""}</td>
                      <td className="py-2 text-xs text-white/60">{t.id}</td>
                      <td className="py-2 text-right">
                        {/* ② Delete */}
                        <form action={deleteTransaction}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}