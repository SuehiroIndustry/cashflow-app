"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// 既存 actions（収入/支出は cash_flows 集計の想定で残す）
import { getMonthlyIncomeExpense } from "@/app/dashboard/_actions/getMonthlyIncomeExpense";

type Account = { id: string; name: string };

type MonthAgg = {
  month: string; // "YYYY-MM"
  balance: number;
  income: number;
  expense: number;
};

function ym(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}
function monthStartISO(ymStr: string) {
  // v_cash_monthly_balance_by_account.month は date（= 月初日）想定
  return `${ymStr}-01`;
}
function yen(n: number) {
  return `¥${Math.trunc(n).toLocaleString()}`;
}

/**
 * getMonthlyIncomeExpense の引数形式揺れを吸収
 * - ({ cash_account_id, month })
 * - (cash_account_id, month)
 * - (cash_account_id)
 */
async function fetchMonthlyIncomeExpense(
  cashAccountId: string,
  monthYm: string
): Promise<{ income: number; expense: number }> {
  const fn: any = getMonthlyIncomeExpense as any;

  // month は action 側が 'YYYY-MM' を想定してる可能性があるので monthYm を渡す
  // （もし action が 'YYYY-MM-01' を期待してたら、ここだけ monthStartISO(monthYm) に変えてOK）
  try {
    const r = await fn({ cash_account_id: cashAccountId, month: monthYm });
    return {
      income: Number(r?.income ?? 0) || 0,
      expense: Number(r?.expense ?? 0) || 0,
    };
  } catch {}

  try {
    const r = await fn(cashAccountId, monthYm);
    return {
      income: Number(r?.income ?? 0) || 0,
      expense: Number(r?.expense ?? 0) || 0,
    };
  } catch {}

  try {
    const r = await fn(cashAccountId);
    return {
      income: Number(r?.income ?? 0) || 0,
      expense: Number(r?.expense ?? 0) || 0,
    };
  } catch {}

  return { income: 0, expense: 0 };
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [range, setRange] = useState<6 | 12>(12);
  const [currentMonth] = useState<string>(() => ym(new Date()));

  // Overview
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);

  // Monthly card
  const [monthBalance, setMonthBalance] = useState(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState(0);

  // Chart
  const [series, setSeries] = useState<MonthAgg[]>([]);

  // Auth & accounts（cash_accounts を直接読む：RLSで user_id が効く前提）
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        router.push("/login");
        return;
      }

      const { data, error: accErr } = await supabase
        .from("cash_accounts")
        .select("id,name")
        .order("id", { ascending: true });

      if (accErr) {
        setError(accErr.message);
        setLoading(false);
        return;
      }

      const list: Account[] =
        (data ?? []).map((a: any) => ({ id: String(a.id), name: String(a.name) })) ?? [];

      setAccounts(list);
      setSelectedAccountId(list[0]?.id ?? "");
      setLoading(false);
    })();
  }, [router, supabase]);

  // Load dashboard data（残高は v_cash_monthly_balance_by_account を読む）
  useEffect(() => {
    if (!selectedAccountId) return;

    (async () => {
      setError("");

      try {
        const thisYm = currentMonth;
        const prevYm = ym(addMonths(new Date(`${thisYm}-01T00:00:00.000Z`), -1));

        const thisMonthDate = monthStartISO(thisYm);
        const prevMonthDate = monthStartISO(prevYm);

        // 1) 月次残高（ビュー）
        const { data: balRows, error: balErr } = await supabase
          .from("v_cash_monthly_balance_by_account")
          .select("month,balance")
          .eq("cash_account_id", Number(selectedAccountId))
          .in("month", [thisMonthDate, prevMonthDate]);

        if (balErr) throw new Error(balErr.message);

        const balMap = new Map<string, number>();
        for (const r of balRows ?? []) {
          balMap.set(String((r as any).month).slice(0, 10), Number((r as any).balance ?? 0) || 0);
        }

        const thisBal = balMap.get(thisMonthDate) ?? 0;
        const prevBal = balMap.get(prevMonthDate) ?? 0;

        setMonthBalance(thisBal);
        setPrevMonthBalance(prevBal);
        setCurrentBalance(thisBal);

        // 2) 今月の収入/支出（action）
        const ie = await fetchMonthlyIncomeExpense(String(selectedAccountId), thisYm);
        setMonthIncome(ie.income);
        setMonthExpense(ie.expense);

        // 3) グラフ（月配列）
        const monthsYm: string[] = [];
        for (let i = range - 1; i >= 0; i--) {
          monthsYm.push(ym(addMonths(new Date(`${thisYm}-01T00:00:00.000Z`), -i)));
        }
        const monthsDate = monthsYm.map(monthStartISO);

        // 3-1) バランス（ビューをまとめて取得）
        const { data: chartBalRows, error: chartBalErr } = await supabase
          .from("v_cash_monthly_balance_by_account")
          .select("month,balance")
          .eq("cash_account_id", Number(selectedAccountId))
          .in("month", monthsDate)
          .order("month", { ascending: true });

        if (chartBalErr) throw new Error(chartBalErr.message);

        const chartBalMap = new Map<string, number>();
        for (const r of chartBalRows ?? []) {
          const k = String((r as any).month).slice(0, 10); // YYYY-MM-01
          chartBalMap.set(k, Number((r as any).balance ?? 0) || 0);
        }

        // 3-2) 収入/支出（actionを月ごとに）
        const rows: MonthAgg[] = [];
        for (const m of monthsYm) {
          const b = chartBalMap.get(monthStartISO(m)) ?? 0;
          const ie2 = await fetchMonthlyIncomeExpense(String(selectedAccountId), m);
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
  }, [selectedAccountId, currentMonth, range, supabase]);

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
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            disabled={loading || accounts.length === 0}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {selectedAccountId ? (
            <span className="text-xs text-white/40">id: {selectedAccountId}</span>
          ) : null}
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
            ※ 残高は <code>v_cash_monthly_balance_by_account</code>（ビュー）から取得。
            monthly_cash_account_balances が 0件でも数字が出る。
          </div>
        </div>
      </div>
    </main>
  );
}