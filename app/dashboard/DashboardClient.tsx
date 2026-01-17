"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// ✅ 型は _types からのみ import（ルール）
import type { CashAccount, MonthlyCashBalanceRow } from "./_types";

/* =====================
 * util
 * ===================== */
function ym(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function ymToDate(ymStr: string) {
  // DBの month(date) は YYYY-MM-01 で持つ前提
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

/* =====================
 * component
 * ===================== */
export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );

  const [range, setRange] = useState<6 | 12>(12);
  const currentMonth = useMemo(() => ym(new Date()), []);

  // overview
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);

  // monthly card
  const [monthBalance, setMonthBalance] = useState(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState(0);

  // chart
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);

  /* =====================
   * init: accounts
   * ===================== */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const { data, error } = await supabase
          .from("cash_accounts")
          .select("id,name")
          .order("id", { ascending: true });

        if (error) throw error;

        const accs = (data ?? []) as CashAccount[];
        setAccounts(accs);
        setSelectedAccountId(accs[0]?.id ?? null);
      } catch (e) {
        console.error(e);
        setError("口座一覧の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  /* =====================
   * load monthly balances
   * ===================== */
  useEffect(() => {
    if (!selectedAccountId) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const thisMonthKey = ymToDate(currentMonth);
        const prevMonthKey = ymToDate(
          ym(addMonths(new Date(currentMonth + "-01"), -1))
        );

        const from = ymToDate(
          ym(addMonths(new Date(currentMonth + "-01"), -(range - 1)))
        );

        // ✅ monthly_cash_account_balances から直接取る（RLS通る前提）
        const { data, error } = await supabase
          .from("monthly_cash_account_balances")
          .select("month,income,expense,balance")
          .eq("cash_account_id", selectedAccountId)
          .gte("month", from)
          .order("month", { ascending: true });

        if (error) throw error;

        const rows = (data ?? []) as MonthlyCashBalanceRow[];
        setChartRows(rows);

        const thisMonth = rows.find((r) => r.month === thisMonthKey);
        const prevMonth = rows.find((r) => r.month === prevMonthKey);

        const mb = thisMonth?.balance ?? 0;
        const pb = prevMonth?.balance ?? 0;

        setMonthBalance(mb);
        setPrevMonthBalance(pb);

        setCurrentBalance(mb);
        setMonthIncome(thisMonth?.income ?? 0);
        setMonthExpense(thisMonth?.expense ?? 0);
      } catch (e) {
        console.error(e);
        setError("データ取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAccountId, range, currentMonth, supabase]);

  /* =====================
   * render
   * ===================== */
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h1>Cashflow Dashboard</h1>

      <div style={{ marginBottom: 16 }}>
        <label>
          Account:{" "}
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <span style={{ marginLeft: 12 }}>id: {selectedAccountId ?? "-"}</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2>Overview</h2>
        <div>Current Balance: {yen(currentBalance)}</div>
        <div>This Month Income: {yen(monthIncome)}</div>
        <div>This Month Expense: {yen(monthExpense)}</div>
        <div>Net: {yen(monthIncome - monthExpense)}</div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2>月次残高</h2>
        <div>{yen(monthBalance)}</div>
        <div>前月比: {yen(monthBalance - prevMonthBalance)}</div>
      </div>

      <div>
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setRange(6)}>last 6 months</button>{" "}
          <button onClick={() => setRange(12)}>last 12 months</button>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingRight: 16 }}>Month</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Balance</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Income</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Expense</th>
            </tr>
          </thead>
          <tbody>
            {chartRows.map((r) => (
              <tr key={r.month}>
                <td style={{ paddingRight: 16 }}>{r.month}</td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  {yen(r.balance)}
                </td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  {yen(r.income)}
                </td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  {yen(r.expense)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!chartRows.length && (
          <div style={{ marginTop: 12, opacity: 0.7 }}>
            monthly_cash_account_balances に該当データがありません（RLS or
            データ未作成の可能性）
          </div>
        )}
      </div>
    </div>
  );
}