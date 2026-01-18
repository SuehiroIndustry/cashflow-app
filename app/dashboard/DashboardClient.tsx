// app/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// actions
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getMonthlyCashBalance } from "@/app/dashboard/_actions/getMonthlyCashBalance";
import { getMonthlyIncomeExpense } from "@/app/dashboard/_actions/getMonthlyIncomeExpense";
import { createCashFlow } from "@/app/dashboard/_actions/createCashFlow";
import { getCashCategories } from "@/app/dashboard/_actions/getCashCategories";
import { getCashFlows } from "@/app/dashboard/_actions/getCashFlows";
import { deleteCashFlow } from "@/app/dashboard/_actions/deleteCashFlow";

// types（ルール：_types からだけ）
import type {
  CashAccount,
  CashCategory,
  MonthlyCashBalanceRow,
  CashFlowCreateInput,
  CashFlowSection,
  CashFlowListRow,
} from "./_types";

function ym(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "YYYY-MM" -> "YYYY-MM-01" */
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

function sectionLabel(s: CashFlowSection) {
  return s === "in" ? "in（収入）" : "out（支出）";
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [range, setRange] = useState<6 | 12>(12);
  const [currentMonth, setCurrentMonth] = useState<string>(() => ym(new Date()));

  // categories（入力フォーム用）
  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // overview
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);

  // monthly card
  const [monthBalance, setMonthBalance] = useState(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState(0);

  // chart/table rows
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);

  // cash flow list (当月明細)
  const [cashFlows, setCashFlows] = useState<CashFlowListRow[]>([]);

  // --- CashFlow input form state ---
  const [cfDate, setCfDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [cfSection, setCfSection] = useState<CashFlowSection>("in");
  const [cfAmount, setCfAmount] = useState<string>("1000");
  const [cfDesc, setCfDesc] = useState<string>("");

  async function reloadAll(accountId: number, monthKey: string, monthsBack: number) {
    // categories（最初に一回取れればOKだが、雑にここで取っても問題ない）
    const cats = await getCashCategories();
    setCategories(cats);
    const initialCatId = cats[0]?.id ?? null;
    setSelectedCategoryId((prev) => prev ?? initialCatId);

    // ① 今月・前月 snapshot（server action）
    const prevMonthKey = ymToDate(ym(addMonths(new Date(monthKey), -1)));

    const thisSnap = await getMonthlyCashBalance({
      cash_account_id: accountId,
      month: monthKey,
    });

    const prevSnap = await getMonthlyCashBalance({
      cash_account_id: accountId,
      month: prevMonthKey,
    });

    setMonthBalance(Number(thisSnap?.balance ?? 0));
    setPrevMonthBalance(Number(prevSnap?.balance ?? 0));
    setCurrentBalance(Number(thisSnap?.balance ?? 0));

    // ② 今月の収入・支出（server action）
    const ie = await getMonthlyIncomeExpense({
      cash_account_id: accountId,
      month: monthKey,
    });
    setMonthIncome(Number(ie.income ?? 0));
    setMonthExpense(Number(ie.expense ?? 0));

    // ③ 当月の明細（server action）
    const flows = await getCashFlows({
      cash_account_id: accountId,
      month: monthKey,
    });
    setCashFlows(flows);

    // ④ チャート/表（client select）
    // user_id は取らない（使わないし、RLS事故の元）
    const from = ymToDate(ym(addMonths(new Date(monthKey), -(monthsBack - 1))));
    const { data, error: qErr } = await supabase
      .from("monthly_cash_account_balances")
      .select("cash_account_id, month, income, expense, balance, updated_at")
      .eq("cash_account_id", accountId)
      .gte("month", from)
      .order("month", { ascending: true });

    if (qErr) throw qErr;

    setChartRows((data ?? []) as MonthlyCashBalanceRow[]);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const accs = await getAccounts();
        setAccounts(accs);

        const initialId = accs[0]?.id ?? null;
        setSelectedAccountId(initialId);

        if (!initialId) {
          setLoading(false);
          return;
        }

        const monthKey = ymToDate(currentMonth);
        await reloadAll(initialId, monthKey, range);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "読み込み中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // account/month/range change
  useEffect(() => {
    (async () => {
      if (!selectedAccountId) return;
      try {
        setLoading(true);
        setError("");
        const monthKey = ymToDate(currentMonth);
        await reloadAll(selectedAccountId, monthKey, range);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "更新中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, currentMonth, range]);

  async function onSubmitCashFlow() {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError("");

      const amount = Number(cfAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("金額が不正です（1以上の数値）");
      }

      // manual はカテゴリ必須
      if (!selectedCategoryId) {
        throw new Error("カテゴリが未選択です（manualは必須）");
      }

      const input: CashFlowCreateInput = {
        cash_account_id: selectedAccountId,
        date: cfDate,
        section: cfSection,
        amount,
        cash_category_id: selectedCategoryId,
        description: cfDesc ? cfDesc : null,
      };

      await createCashFlow(input);

      // 反映
      const monthKey = ymToDate(currentMonth);
      await reloadAll(selectedAccountId, monthKey, range);

      // 説明だけクリア
      setCfDesc("");
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "登録中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteCashFlow(row: CashFlowListRow) {
    if (!selectedAccountId) return;

    const ok = window.confirm(
      `削除しますか？\n${row.date} / ${sectionLabel(row.section)} / ${yen(row.amount)}`
    );
    if (!ok) return;

    try {
      setLoading(true);
      setError("");

      await deleteCashFlow({
        id: row.id,
        cash_account_id: row.cash_account_id,
      });

      // 反映
      const monthKey = ymToDate(currentMonth);
      await reloadAll(selectedAccountId, monthKey, range);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "削除中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const selectedName =
    accounts.find((a) => a.id === selectedAccountId)?.name ?? "";

  return (
    <div style={{ padding: 24 }}>
      <h2>Cashflow Dashboard</h2>

      {error ? <p style={{ color: "tomato" }}>Error: {error}</p> : null}

      <div style={{ marginTop: 12 }}>
        <div>
          Account:{" "}
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(Number(e.target.value))}
            disabled={loading || accounts.length === 0}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 8 }}>
          Month:{" "}
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            disabled={loading}
          />
          {"  "}
          Range:{" "}
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as 6 | 12)}
            disabled={loading}
          >
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
          </select>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <h3>入力（cash_flows）</h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          日付{" "}
          <input
            type="date"
            value={cfDate}
            onChange={(e) => setCfDate(e.target.value)}
            disabled={loading}
          />
        </label>

        <label>
          区分{" "}
          <select
            value={cfSection}
            onChange={(e) => setCfSection(e.target.value as CashFlowSection)}
            disabled={loading}
          >
            <option value="in">in（収入）</option>
            <option value="out">out（支出）</option>
          </select>
        </label>

        <label>
          金額{" "}
          <input
            inputMode="numeric"
            value={cfAmount}
            onChange={(e) => setCfAmount(e.target.value)}
            disabled={loading}
            placeholder="例: 1000"
          />
        </label>

        <label>
          カテゴリ（manual必須）{" "}
          <select
            value={selectedCategoryId ?? ""}
            onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
            disabled={loading || categories.length === 0}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} / id:{c.id}
              </option>
            ))}
          </select>
        </label>

        <label style={{ flex: "1 1 240px" }}>
          メモ{" "}
          <input
            value={cfDesc}
            onChange={(e) => setCfDesc(e.target.value)}
            disabled={loading}
            placeholder="任意"
            style={{ width: "100%" }}
          />
        </label>

        <button onClick={onSubmitCashFlow} disabled={loading || !selectedAccountId}>
          {loading ? "..." : "登録"}
        </button>

        <button
          onClick={() => router.refresh()}
          disabled={loading}
          title="UIが怪しい時の強制リフレッシュ"
        >
          refresh
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <h3>Overview</h3>
      <div>
        <div>
          Account: {selectedName} / id: {selectedAccountId ?? "-"}
        </div>
        <div>Current Balance: {yen(currentBalance)}</div>
        <div>This Month Income: {yen(monthIncome)}</div>
        <div>This Month Expense: {yen(monthExpense)}</div>
        <div>Net: {yen(monthIncome - monthExpense)}</div>
      </div>

      <h3 style={{ marginTop: 16 }}>月次残高</h3>
      <div>
        <div>{yen(monthBalance)}</div>
        <div>前月比: {yen(monthBalance - prevMonthBalance)}</div>
      </div>

      <h3 style={{ marginTop: 16 }}>当月の明細</h3>
      {cashFlows.length === 0 ? (
        <p>当月の cash_flows がありません</p>
      ) : (
        <table style={{ marginTop: 8, width: "100%", maxWidth: 980 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingRight: 12 }}>日付</th>
              <th style={{ textAlign: "left", paddingRight: 12 }}>区分</th>
              <th style={{ textAlign: "right", paddingRight: 12 }}>金額</th>
              <th style={{ textAlign: "left", paddingRight: 12 }}>カテゴリ</th>
              <th style={{ textAlign: "left", paddingRight: 12 }}>メモ</th>
              <th style={{ textAlign: "left" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {cashFlows.map((r) => (
              <tr key={r.id}>
                <td style={{ paddingRight: 12 }}>{r.date}</td>
                <td style={{ paddingRight: 12 }}>{sectionLabel(r.section)}</td>
                <td style={{ textAlign: "right", paddingRight: 12 }}>
                  {yen(Number(r.amount ?? 0))}
                </td>
                <td style={{ paddingRight: 12 }}>
                  {r.cash_category?.name ?? "-"}
                </td>
                <td style={{ paddingRight: 12 }}>
                  {r.description ?? ""}
                </td>
                <td>
                  <button
                    onClick={() => onDeleteCashFlow(r)}
                    disabled={loading}
                    title="削除"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginTop: 16 }}>last {range} months</h3>

      {chartRows.length === 0 ? (
        <p>monthly_cash_account_balances に該当データがありません（RLS or データ未作成の可能性）</p>
      ) : (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", paddingRight: 16 }}>Month</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Balance</th>
              <th style={{ textAlign: "right", paddingRight: 16 }}>Income</th>
              <th style={{ textAlign: "right" }}>Expense</th>
            </tr>
          </thead>
          <tbody>
            {chartRows.map((r) => (
              <tr key={`${r.cash_account_id}-${r.month}`}>
                <td style={{ paddingRight: 16 }}>{r.month}</td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  {yen(Number(r.balance ?? 0))}
                </td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>
                  {yen(Number(r.income ?? 0))}
                </td>
                <td style={{ textAlign: "right" }}>
                  {yen(Number(r.expense ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}