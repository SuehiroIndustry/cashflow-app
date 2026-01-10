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

type AlertRow = {
  user_id: string;
  current_balance: number | string | null;
  monthly_fixed_cost: number | string | null;
  month_expense: number | string | null;
  projected_balance: number | string | null;
  level: "GREEN" | "YELLOW" | "RED" | string;
  computed_at: string;
};

type AccountBalanceRow = {
  user_id: string;
  account_id: string;
  balance: number | string | null;
};

type MonthlyAllRow = {
  user_id: string;
  month: string; // YYYY-MM-01
  income: number | string | null;
  expense: number | string | null;
  balance: number | string | null;
};

type MonthlyAccountRow = {
  user_id: string;
  account_id: string;
  month: string; // YYYY-MM-01
  income: number | string | null;
  expense: number | string | null;
  balance: number | string | null;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(n);
}

function toNum(v: unknown) {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthStartISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function levelBadge(level: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
  if (level === "RED") return `${base} bg-red-500/15 text-red-300 border border-red-500/30`;
  if (level === "YELLOW") return `${base} bg-amber-500/15 text-amber-200 border border-amber-500/30`;
  return `${base} bg-emerald-500/15 text-emerald-200 border border-emerald-500/30`;
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

  // 「閲覧フィルタ」
  const filterAccountId = !isAllView && sp.account ? sp.account : null;

  // 「登録」は必ず account_id を持つ
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

  // ---- alerts (SSR) ----
  // ※ view がまだ無い/壊れてる場合もあるので、落とさず画面に出す
  const { data: alertRowRaw, error: alertErr } = await supabase
    .from("alerts_daily")
    .select("user_id,current_balance,monthly_fixed_cost,month_expense,projected_balance,level,computed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const alertRow = (alertRowRaw ?? null) as AlertRow | null;

  // ---- Summary (VIEW参照) ----
  const month = monthStartISO();

  // 1) 現在残高（All なら合算 / 口座なら単体）
  let currentBalance = 0;

  if (isAllView) {
    const { data: abRaw, error: abErr } = await supabase
      .from("account_balances")
      .select("balance")
      .eq("user_id", user.id);

    if (!abErr) {
      currentBalance = (abRaw ?? []).reduce((sum, r) => sum + toNum((r as any).balance), 0);
    }
  } else if (filterAccountId) {
    const { data: abRaw, error: abErr } = await supabase
      .from("account_balances")
      .select("user_id,account_id,balance")
      .eq("user_id", user.id)
      .eq("account_id", filterAccountId)
      .maybeSingle();

    if (!abErr && abRaw) {
      currentBalance = toNum((abRaw as AccountBalanceRow).balance);
    }
  }

  // 2) 今月の収入/支出（All or account）
  let monthIncome = 0;
  let monthExpense = 0;

  if (isAllView) {
    const { data: mRaw, error: mErr } = await supabase
      .from("monthly_user_balances")
      .select("user_id,month,income,expense,balance")
      .eq("user_id", user.id)
      .eq("month", month)
      .maybeSingle();

    if (!mErr && mRaw) {
      const row = mRaw as MonthlyAllRow;
      monthIncome = toNum(row.income);
      monthExpense = toNum(row.expense);
    }
  } else if (filterAccountId) {
    const { data: mRaw, error: mErr } = await supabase
      .from("monthly_account_balances")
      .select("user_id,account_id,month,income,expense,balance")
      .eq("user_id", user.id)
      .eq("account_id", filterAccountId)
      .eq("month", month)
      .maybeSingle();

    if (!mErr && mRaw) {
      const row = mRaw as MonthlyAccountRow;
      monthIncome = toNum(row.income);
      monthExpense = toNum(row.expense);
    }
  }

  // ---- transactions（表示用）----
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

  const currentAccountLabel =
    isAllView ? "All" : accounts.find((a) => a.id === filterAccountId)?.name ?? "Unknown";

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <div className="mt-2 text-sm text-neutral-400">Logged in: {user.email ?? user.id}</div>
        <div className="mt-1 text-sm text-neutral-400">Account: {currentAccountLabel}</div>
      </div>

      {/* Alerts */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-200">Alert</div>
          {alertRow?.level ? <span className={levelBadge(alertRow.level)}>{alertRow.level}</span> : null}
        </div>

        {alertErr ? (
          <div className="text-sm text-neutral-300">
            <div className="font-semibold text-neutral-200">Alert: error</div>
            <div className="mt-1 text-neutral-400">{alertErr.message}</div>
            <div className="mt-2 text-xs text-neutral-500">
              ※ まずは alerts_daily VIEW が作成済みか確認して（SQL Editor → Run → Views）。
            </div>
          </div>
        ) : !alertRow ? (
          <div className="text-sm text-neutral-400">
            No alert data yet.（alerts_daily が空 or まだ計算できてない）
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="text-xs text-neutral-500">Current</div>
              <div className="mt-1 text-lg font-semibold">{yen(toNum(alertRow.current_balance))}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="text-xs text-neutral-500">Fixed (month)</div>
              <div className="mt-1 text-lg font-semibold">{yen(toNum(alertRow.monthly_fixed_cost))}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="text-xs text-neutral-500">Expense (month)</div>
              <div className="mt-1 text-lg font-semibold">{yen(toNum(alertRow.month_expense))}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="text-xs text-neutral-500">Projected</div>
              <div className="mt-1 text-lg font-semibold">{yen(toNum(alertRow.projected_balance))}</div>
            </div>
          </div>
        )}
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

      {/* Summary (VIEW) */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Current Balance</div>
          <div className="mt-2 text-2xl font-semibold">{yen(currentBalance)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Income (this month)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(monthIncome)}</div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Expense (this month)</div>
          <div className="mt-2 text-2xl font-semibold">{yen(monthExpense)}</div>
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
            <div className="mt-2 text-xs text-neutral-500">● まずは insert→select が通ることを確認。</div>
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
                    <td className="py-2 text-right">{yen(toNum(t.amount))}</td>
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