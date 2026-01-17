"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Account = {
  id: string;
  name: string;
};

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

function yen(n: number) {
  return `¥${Math.trunc(n).toLocaleString()}`;
}

function startEndOfMonth(month: string) {
  const start = `${month}-01`;
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const [currentMonth] = useState<string>(() => ym(new Date()));

  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [monthIncome, setMonthIncome] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);

  const [monthBalance, setMonthBalance] = useState<number>(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState<number>(0);

  const [range, setRange] = useState<6 | 12>(12);
  const [series, setSeries] = useState<MonthAgg[]>([]);
  const [error, setError] = useState<string>("");

  // --- Auth & Accounts ---
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

      const list = (data ?? []).map((a: any) => ({
        id: String(a.id),
        name: String(a.name),
      })) as Account[];

      setAccounts(list);
      setSelectedAccountId(list[0]?.id ?? "");
      setLoading(false);
    })();
  }, [router, supabase]);

  // --- Load balances / income / expense / chart ---
  useEffect(() => {
    if (!selectedAccountId) return;

    (async () => {
      setError("");

      const targetMonth = currentMonth;
      const prevMonth = ym(addMonths(new Date(`${targetMonth}-01T00:00:00.000Z`), -1));

      // 月次残高
      const mbThis = await supabase
        .from("cash_monthly_balances")
        .select("month,balance")
        .eq("cash_account_id", selectedAccountId)
        .eq("month", targetMonth)
        .maybeSingle();

      const mbPrev = await supabase
        .from("cash_monthly_balances")
        .select("month,balance")
        .eq("cash_account_id", selectedAccountId)
        .eq("month", prevMonth)
        .maybeSingle();

      const thisBal = mbThis.data ? Number((mbThis.data as any).balance) || 0 : 0;
      const prevBal = mbPrev.data ? Number((mbPrev.data as any).balance) || 0 : 0;

      setMonthBalance(thisBal);
      setPrevMonthBalance(prevBal);
      setCurrentBalance(thisBal);

      // 今月の Income / Expense
      const { start, end } = startEndOfMonth(targetMonth);
      const flowsRes = await supabase
        .from("cash_flows")
        .select("type,amount,date")
        .eq("cash_account_id", selectedAccountId)
        .gte("date", start)
        .lt("date", end);

      if (flowsRes.error) {
        setError(flowsRes.error.message);
        setMonthIncome(0);
        setMonthExpense(0);
      } else {
        let inc = 0;
        let exp = 0;
        for (const r of flowsRes.data ?? []) {
          const amt = Number((r as any).amount) || 0;
          if ((r as any).type === "income") inc += amt;
          if ((r as any).type === "expense") exp += amt;
        }
        setMonthIncome(inc);
        setMonthExpense(exp);
      }

      // グラフ（rangeヶ月）
      const months: string[] = [];
      for (let i = range - 1; i >= 0; i--) {
        months.push(ym(addMonths(new Date(`${targetMonth}-01T00:00:00.000Z`), -i)));
      }

      const mbRangeRes = await supabase
        .from("cash_monthly_balances")
        .select("month,balance")
        .eq("cash_account_id", selectedAccountId)
        .in("month", months);

      const mbMap = new Map<string, number>();
      if (!mbRangeRes.error) {
        for (const r of mbRangeRes.data ?? []) {
          mbMap.set(String((r as any).month), Number((r as any).balance) || 0);
        }
      }

      const rangeStart = `${months[0]}-01`;
      const rangeEnd = (() => {
        const { end: e } = startEndOfMonth(months[months.length - 1]);
        return e;
      })();

      const flowsRangeRes = await supabase
        .from("cash_flows")
        .select("type,amount,date")
        .eq("cash_account_id", selectedAccountId)
        .gte("date", rangeStart)
        .lt("date", rangeEnd);

      const incomeMap = new Map<string, number>();
      const expenseMap = new Map<string, number>();

      if (!flowsRangeRes.error) {
        for (const r of flowsRangeRes.data ?? []) {
          const amt = Number((r as any).amount) || 0;
          const m = String((r as any).date).slice(0, 7);
          if ((r as any).type === "income") incomeMap.set(m, (incomeMap.get(m) || 0) + amt);
          if ((r as any).type === "expense") expenseMap.set(m, (expenseMap.get(m) || 0) + amt);
        }
      }

      setSeries(
        months.map((m) => ({
          month: m,
          balance: mbMap.get(m) ?? 0,
          income: incomeMap.get(m) ?? 0,
          expense: expenseMap.get(m) ?? 0,
        }))
      );
    })();
  }, [selectedAccountId, range, currentMonth, supabase]);

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

        {/* Overview */}
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

        {/* Charts */}
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
            ※ Income/Expense は cash_flows（manual）の月次集計。Balance は cash_monthly_balances。
          </div>
        </div>
      </div>
    </main>
  );
}