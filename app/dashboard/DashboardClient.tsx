"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// actions
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getMonthlyCashBalance } from "@/app/dashboard/_actions/getMonthlyCashBalance";
import { getMonthlyIncomeExpense } from "@/app/dashboard/_actions/getMonthlyIncomeExpense";

// 型は _types からだけ import（ルール遵守）
import type { CashAccount, MonthAgg } from "./_types";

function ym(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "YYYY-MM" -> "YYYY-MM-01"（DBの month(date) に合わせる） */
function ymToDate(ymStr: string) {
  return `${ymStr}-01`;
}

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function yen(n: number) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return `¥${v.toLocaleString()}`;
}

/**
 * action 側の引数形式ゆれを吸収
 *  - ({ cash_account_id, month })
 *  - (cash_account_id, month)
 *  - (cash_account_id)
 */
async function fetchMonthlyCashBalance(cashAccountId: number, monthDate: string): Promise<number> {
  const fn: any = getMonthlyCashBalance as any;

  // 1) object
  try {
    const r = await fn({ cash_account_id: cashAccountId, month: monthDate });
    const v = typeof r === "number" ? r : Number(r?.balance ?? r ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch {}

  // 2) 2 args
  try {
    const r = await fn(cashAccountId, monthDate);
    const v = typeof r === "number" ? r : Number(r?.balance ?? r ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch {}

  // 3) 1 arg
  try {
    const r = await fn(cashAccountId);
    const v = typeof r === "number" ? r : Number(r?.balance ?? r ?? 0);
    return Number.isFinite(v) ? v : 0;
  } catch {}

  return 0;
}

async function fetchMonthlyIncomeExpense(
  cashAccountId: number,
  monthDate: string
): Promise<{ income: number; expense: number }> {
  const fn: any = getMonthlyIncomeExpense as any;

  // 1) object
  try {
    const r = await fn({ cash_account_id: cashAccountId, month: monthDate });
    return { income: Number(r?.income ?? 0) || 0, expense: Number(r?.expense ?? 0) || 0 };
  } catch {}

  // 2) 2 args
  try {
    const r = await fn(cashAccountId, monthDate);
    return { income: Number(r?.income ?? 0) || 0, expense: Number(r?.expense ?? 0) || 0 };
  } catch {}

  // 3) 1 arg
  try {
    const r = await fn(cashAccountId);
    return { income: Number(r?.income ?? 0) || 0, expense: Number(r?.expense ?? 0) || 0 };
  } catch {}

  return { income: 0, expense: 0 };
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [range, setRange] = useState<6 | 12>(12);
  const [currentMonth] = useState<string>(() => ym(new Date())); // "YYYY-MM"

  // Overview
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);

  // Monthly card
  const [monthBalance, setMonthBalance] = useState(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState(0);

  // Chart
  const [series, setSeries] = useState<MonthAgg[]>([]);

  // Auth & accounts
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.push("/login");
        return;
      }

      try {
        const acc = await (getAccounts as any)();
        const list: CashAccount[] = (acc ?? []).map((a: any) => ({
          id: Number(a.id),
          name: String(a.name),
        }));

        setAccounts(list);
        setSelectedAccountId(list[0]?.id ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load accounts");
      } finally {
        setLoading(false);
      }
    })();
  }, [router, supabase]);

  // Load dashboard data
  useEffect(() => {
    if (!selectedAccountId) return;

    (async () => {
      setError("");

      try {
        const thisYm = currentMonth; // "YYYY-MM"
        const prevYm = ym(addMonths(new Date(`${thisYm}-01T00:00:00.000Z`), -1));

        // ✅ DBの month(date) に合わせて "YYYY-MM-01" を渡す
        const thisMonthDate = ymToDate(thisYm);
        const prevMonthDate = ymToDate(prevYm);

        // 月次残高
        const thisBal = await fetchMonthlyCashBalance(selectedAccountId, thisMonthDate);
        const prevBal = await fetchMonthlyCashBalance(selectedAccountId, prevMonthDate);

        setMonthBalance(thisBal);
        setPrevMonthBalance(prevBal);
        setCurrentBalance(thisBal);

        // 今月収支
        const ie = await fetchMonthlyIncomeExpense(selectedAccountId, thisMonthDate);
        setMonthIncome(ie.income);
        setMonthExpense(ie.expense);

        // グラフ（月配列）
        const months: string[] = [];
        for (let i = range - 1; i >= 0; i--) {
          months.push(ym(addMonths(new Date(`${thisYm}-01T00:00:00.000Z`), -i))); // "YYYY-MM"
        }

        const rows: MonthAgg[] = [];
        for (const m of months) {
          const monthDate = ymToDate(m); // "YYYY-MM-01"
          const b = await fetchMonthlyCashBalance(selectedAccountId, monthDate);
          const ie2 = await fetchMonthlyIncomeExpense(selectedAccountId, monthDate);
          rows.push({ month: m, balance: b, income: ie2.income, expense: ie2.expense });
        }

        setSeries(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard data");
        setMonthBalance(0);
        setPrevMonthBalance(0);
        setCurrentBalance(0);
        setMonthIncome(0);
        setMonthExpense(0);
        setSeries([]);
      }
    })();
  }, [selectedAccountId, currentMonth, range]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Cashflow Dashboard</h1>
          <button
            onClick={onLogout}
            className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
          >
            Logout
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-white/70">
          <span>Account</span>
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            disabled={loading || accounts.length === 0}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {selectedAccountId ? <span className="text-xs text-white/40">id: {selectedAccountId}</span> : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white/80">Overview</h2>
            <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-white/60">Current Balance</div>
              <div className="text-right">{yen(currentBalance)}</div>
              <div className="text-white/60">This Month Income</div>
              <div className="text-right">{yen(monthIncome)}</div>
              <div className="text-white/60">This Month Expense</div>
              <div className="text-right">{yen(monthExpense)}</div>
              <div className="text-white/60">Net</div>
              <div className="text-right">{yen(monthIncome - monthExpense)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-sm font-semibold text-white/80">月次残高</h2>
            <div className="mt-2 text-2xl font-semibold">{yen(monthBalance)}</div>
            <div className="mt-1 text-xs text-white/50">{currentMonth} 時点</div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="text-white/60">{currentMonth}</div>
              <div className="text-white/60">前月比</div>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <div className="text-white/80">{yen(monthBalance)}</div>
              <div className="text-white/80">{yen(monthBalance - prevMonthBalance)}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white/80">Charts</div>
            <div className="flex gap-2">
              <button
                onClick={() => setRange(6)}
                className={`rounded-md border px-3 py-1 text-xs ${
                  range === 6 ? "border-white/40 bg-white/10" : "border-white/20"
                }`}
              >
                last 6 months
              </button>
              <button
                onClick={() => setRange(12)}
                className={`rounded-md border px-3 py-1 text-xs ${
                  range === 12 ? "border-white/40 bg-white/10" : "border-white/20"
                }`}
              >
                last 12 months
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Month</th>
                  <th className="py-2 pr-3">Balance</th>
                  <th className="py-2 pr-3">Income</th>
                  <th className="py-2 pr-3">Expense</th>
                </tr>
              </thead>
              <tbody>
                {series.map((r) => (
                  <tr key={r.month} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-white/70">{r.month}</td>
                    <td className="py-2 pr-3">{yen(r.balance)}</td>
                    <td className="py-2 pr-3">{yen(r.income)}</td>
                    <td className="py-2 pr-3">{yen(r.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-white/40">
            ※ DBの month は date（YYYY-MM-01）なので、フロントの "YYYY-MM" は内部で "-01" を付けて照合している。
          </div>
        </div>
      </div>
    </main>
  );
}