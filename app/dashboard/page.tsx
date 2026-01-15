// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type CashAccount = {
  id: string | number;
  name: string | null;
};

type CashFlowRow = {
  id: number;
  date: string; // yyyy-mm-dd
  type: "income" | "expense" | string;
  amount: number | null;
  description: string | null;
  cash_account_id: string | number | null;
};

function yen(n: number) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(n);
}

function pillClass(active: boolean) {
  return [
    "inline-flex items-center justify-center rounded-full px-3 py-1 text-sm",
    "border border-white/15 hover:border-white/30 transition",
    active ? "bg-white/15" : "bg-transparent",
  ].join(" ");
}

function cardClass() {
  return [
    "rounded-2xl border border-white/10 bg-white/5",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
  ].join(" ");
}

function toNumber(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function startOfMonthYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // "2026-01"
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ account?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const selectedAccount = sp.account ?? "all"; // "all" | account_id
  const isAll = selectedAccount === "all" || !selectedAccount;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  async function logout() {
    "use server";
    const sb = await createClient();
    await sb.auth.signOut();
    redirect("/login");
  }

  // ---- accounts ----
  const { data: accounts, error: accountsErr } = await supabase
    .from("cash_accounts")
    .select("id,name")
    .eq("user_id", user.id)
    .order("id", { ascending: true });

  if (accountsErr) throw new Error(`cash_accounts load failed: ${accountsErr.message}`);
  const accountList = (accounts ?? []) as CashAccount[];

  const selectedAccountLabel = isAll
    ? "All"
    : accountList.find((a) => String(a.id) === String(selectedAccount))?.name ?? selectedAccount;

  // ---- cash flows (使うのはこれだけ) ----
  let cfQuery = supabase
    .from("cash_flows")
    .select("id,date,type,amount,description,cash_account_id")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(500); // まずは500で十分。必要なら増やす。

  if (!isAll) {
    cfQuery = cfQuery.eq("cash_account_id", selectedAccount);
  }

  const { data: cashFlowsData, error: cashFlowsErr } = await cfQuery;
  if (cashFlowsErr) throw new Error(`cash_flows load failed: ${cashFlowsErr.message}`);

  const cashFlows = (cashFlowsData ?? []) as CashFlowRow[];

  // ---- 集計（VIEWを使わない）----
  const income = cashFlows.reduce((s, r) => (r.type === "income" ? s + toNumber(r.amount) : s), 0);
  const expense = cashFlows.reduce((s, r) => (r.type === "expense" ? s + toNumber(r.amount) : s), 0);
  const balance = income - expense;

  // ---- 簡易 overview（今は最低限：今月支出だけは出す）----
  const ym = startOfMonthYYYYMM(new Date());
  const monthExpense = cashFlows.reduce((s, r) => {
    if (r.type !== "expense") return s;
    if (!r.date?.startsWith(ym)) return s;
    return s + toNumber(r.amount);
  }, 0);

  // 固定費 / 30日予定 / 30日後は、ビューが直るまで0扱いにしておく（UIは壊さない）
  const monthlyFixedCost = 0;
  const plannedOrders30d = 0;
  const projectedBalance = balance - plannedOrders30d;

  // レベル（暫定）：予測残高がマイナスならRED、0〜固定費未満ならYELLOW、それ以外GREEN
  const level =
    projectedBalance < 0 ? "RED" : projectedBalance < Math.max(1, monthlyFixedCost) ? "YELLOW" : "GREEN";

  const levelBadge =
    level === "RED"
      ? "bg-red-500/20 border-red-400/30 text-red-200"
      : level === "YELLOW"
      ? "bg-yellow-500/20 border-yellow-400/30 text-yellow-200"
      : "bg-emerald-500/20 border-emerald-400/30 text-emerald-200";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cashflow Dashboard</h1>
            <div className="mt-2 text-sm text-white/60">
              <div>Logged in: {user.email}</div>
              <div>Account: {String(selectedAccountLabel)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${levelBadge}`}>
              {level}
            </span>
            <form action={logout}>
              <button
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm hover:border-white/30"
                type="submit"
              >
                Logout
              </button>
            </form>
          </div>
        </header>

        {/* account filter */}
        <section className={`${cardClass()} mt-8 p-5`}>
          <div className="text-sm text-white/70">Account filter</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/dashboard?account=all" className={pillClass(isAll)}>
              All
            </a>
            {accountList.map((a) => {
              const active = !isAll && String(a.id) === String(selectedAccount);
              return (
                <a
                  key={String(a.id)}
                  href={`/dashboard?account=${encodeURIComponent(String(a.id))}`}
                  className={pillClass(active)}
                >
                  {a.name ?? `Account ${a.id}`}
                </a>
              );
            })}
          </div>
        </section>

        {/* summary cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">Balance</div>
            <div className="mt-2 text-3xl font-semibold">{yen(balance)}</div>
            <div className="mt-2 text-xs text-white/40">via cash_flows (temporary)</div>
          </div>

          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">Income</div>
            <div className="mt-2 text-3xl font-semibold">{yen(income)}</div>
          </div>

          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">Expense</div>
            <div className="mt-2 text-3xl font-semibold">{yen(expense)}</div>
          </div>
        </section>

        {/* overview cards */}
        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">現在残高</div>
            <div className="mt-2 text-2xl font-semibold">{yen(balance)}</div>
            <div className="mt-2 text-xs text-white/40">computed_at: -</div>
          </div>

          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">今月の支出</div>
            <div className="mt-2 text-2xl font-semibold text-red-200">{yen(monthExpense)}</div>
          </div>

          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">固定費（月）</div>
            <div className="mt-2 text-2xl font-semibold text-amber-200">{yen(monthlyFixedCost)}</div>
          </div>

          <div className={`${cardClass()} p-5 md:col-span-2`}>
            <div className="text-sm text-white/60">30日以内の支払予定</div>
            <div className="mt-2 text-2xl font-semibold">{yen(plannedOrders30d)}</div>
          </div>

          <div className={`${cardClass()} p-5`}>
            <div className="text-sm text-white/60">30日後予測残高</div>
            <div className="mt-2 text-2xl font-semibold">{yen(projectedBalance)}</div>
          </div>
        </section>

        {/* cash flows table */}
        <section className={`${cardClass()} mt-8 p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Cash Flows</h2>
            <div className="text-xs text-white/50">Latest: {cashFlows.length} rows (max 500)</div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left text-xs text-white/50">
                  <th className="border-b border-white/10 pb-2 pr-3">date</th>
                  <th className="border-b border-white/10 pb-2 pr-3">type</th>
                  <th className="border-b border-white/10 pb-2 pr-3">amount</th>
                  <th className="border-b border-white/10 pb-2 pr-3">description</th>
                  <th className="border-b border-white/10 pb-2 pr-3">account_id</th>
                  <th className="border-b border-white/10 pb-2 pr-3">id</th>
                </tr>
              </thead>
              <tbody>
                {cashFlows.map((r) => {
                  const t = String(r.type);
                  const typeBadge =
                    t === "expense"
                      ? "text-red-200"
                      : t === "income"
                      ? "text-emerald-200"
                      : "text-white/80";

                  return (
                    <tr key={r.id} className="text-sm">
                      <td className="border-b border-white/5 py-2 pr-3 text-white/80">{r.date}</td>
                      <td className={`border-b border-white/5 py-2 pr-3 ${typeBadge}`}>{t}</td>
                      <td className="border-b border-white/5 py-2 pr-3">{yen(toNumber(r.amount))}</td>
                      <td className="border-b border-white/5 py-2 pr-3 text-white/80">{r.description ?? ""}</td>
                      <td className="border-b border-white/5 py-2 pr-3 text-white/70">
                        {r.cash_account_id ?? ""}
                      </td>
                      <td className="border-b border-white/5 py-2 pr-3 text-white/50">{r.id}</td>
                    </tr>
                  );
                })}

                {cashFlows.length === 0 && (
                  <tr>
                    <td className="py-6 text-sm text-white/50" colSpan={6}>
                      No rows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-white/40">
            ※ いまはVIEWを信用しない。数字は cash_flows から直計算。
          </div>
        </section>
      </div>
    </main>
  );
}