// app/dashboard/page.tsx
import { redirect } from "next/navigation";
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

type BalanceRow = {
  user_id: string;
  account_id: string; // view上の型が uuid のことが多い
  income: number | null;
  expense: number | null;
  balance: number | null;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(n);
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
    // ここで throw すると画面が死ぬので、ログ出して最低限表示
    console.error("Failed to load cash_accounts:", accountsErr);
  }

  const accounts = (accountsRaw ?? []) as CashAccount[];

  const isAllView = !sp.account || sp.account === "all";
  const filterAccountId = !isAllView ? Number(sp.account) : null;

  const currentAccountLabel = isAllView
    ? "All"
    : accounts.find((a) => a.id === filterAccountId)?.name ?? "Unknown";

  // ---- summary (VIEW: account_balances を直接参照) ----
  // 期待: user_id, account_id, income, expense, balance
  let summaryIncome = 0;
  let summaryExpense = 0;
  let summaryBalance = 0;

  try {
    let q = supabase
      .from("account_balances")
      .select("user_id,account_id,income,expense,balance")
      .eq("user_id", user.id);

    // account を指定してるときだけ絞る（view側の account_id が uuid なら不一致注意）
    // ここでは「all以外なら絞る」だけにしておく
    if (!isAllView && filterAccountId != null) {
      // もし view が cash_account_id(int) を持ってる構造ならここを account_id じゃなく cash_account_id に変える
      // 今は user が使ってた route.ts に合わせて account_id のままにする
      q = q.eq("account_id", String(filterAccountId));
    }

    const { data, error } = await q;

    if (error) {
      // ここで throw すると /dashboard が死ぬ。なので 0 扱いで画面は出す
      console.error("Failed to load account_balances:", error);
    } else {
      const rows = (data ?? []) as BalanceRow[];
      summaryIncome = rows.reduce((s, r) => s + Number(r.income ?? 0), 0);
      summaryExpense = rows.reduce((s, r) => s + Number(r.expense ?? 0), 0);
      summaryBalance = rows.reduce((s, r) => s + Number(r.balance ?? 0), 0);
    }
  } catch (e) {
    console.error("Unexpected error in summary:", e);
  }

  // ---- recent cash flows ----
  let flows: CashFlowRow[] = [];

  try {
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

    const { data, error } = await q;

    if (error) {
      console.error("Failed to load cash_flows:", error);
    } else {
      flows = (data ?? []) as CashFlowRow[];
    }
  } catch (e) {
    console.error("Unexpected error in cash_flows:", e);
  }

  // ---- UI ----
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <div className="mt-2 text-sm text-neutral-400">
          Logged in: {user.email ?? user.id}
        </div>
        <div className="mt-1 text-sm text-neutral-400">
          Account: {currentAccountLabel}
        </div>
      </div>

      {/* Account filter */}
      <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
        <div className="mb-3 text-sm font-medium text-neutral-300">
          Account filter
        </div>
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
          <div className="mt-2 text-2xl font-semibold">
            {yen(Number(summaryBalance ?? 0))}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            via VIEW: account_balances
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Income</div>
          <div className="mt-2 text-2xl font-semibold">
            {yen(Number(summaryIncome ?? 0))}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="text-xs text-neutral-400">Expense</div>
          <div className="mt-2 text-2xl font-semibold">
            {yen(Number(summaryExpense ?? 0))}
          </div>
        </div>
      </div>

      {/* Cash flows */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-lg font-semibold">Cash Flows</div>
          <div className="text-xs text-neutral-500">
            Latest: {flows.length} rows (max 100)
          </div>
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
                    <td className="py-2 text-right">
                      {yen(Number(r.amount ?? 0))}
                    </td>
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
          ※ summaryは API を叩かず view を直読み（落ちない設計）
        </div>
      </div>
    </div>
  );
}