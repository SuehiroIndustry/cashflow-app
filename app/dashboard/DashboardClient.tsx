"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

// actions
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getMonthlyCashBalance } from "@/app/dashboard/_actions/getMonthlyCashBalance";
import { getMonthlyIncomeExpense } from "@/app/dashboard/_actions/getMonthlyIncomeExpense";
import { getCashCategories } from "@/app/dashboard/_actions/getCashCategories";
import { getCashFlows } from "@/app/dashboard/_actions/getCashFlows";
import { createCashFlow } from "@/app/dashboard/_actions/createCashFlow";
import { deleteCashFlow } from "@/app/dashboard/_actions/deleteCashFlow";

// types（ルール：./_types からだけ）
import type {
  CashAccount,
  CashCategory,
  MonthlyCashBalanceRow,
  CashFlowCreateInput,
  CashFlowSection,
  CashFlowListRow,
  OverviewPayload,
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

/**
 * 受け取った日付文字列を必ず "YYYY-MM-DD" に正規化
 */
function normalizeYmd(input: string) {
  const s = (input ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) return s.replaceAll("/", "-");
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // master
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);

  // selection
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(() => ym(new Date()));
  const [range, setRange] = useState<number>(12);

  // overview numbers
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [monthIncome, setMonthIncome] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);
  const net = useMemo(() => monthIncome - monthExpense, [monthIncome, monthExpense]);

  const [monthlyBalance, setMonthlyBalance] = useState<number>(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState<number>(0);

  // list & chart
  const [cashFlows, setCashFlowsState] = useState<CashFlowListRow[]>([]);
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);

  // form
  const [formDate, setFormDate] = useState<string>(() => normalizeYmd(new Date().toISOString().slice(0, 10)));
  const [formSection, setFormSection] = useState<CashFlowSection>("in");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formMemo, setFormMemo] = useState<string>("");

  const selectedName = useMemo(() => {
    const a = accounts.find((x) => x.id === selectedAccountId);
    return a?.name ?? "";
  }, [accounts, selectedAccountId]);

  // --- loaders --------------------------------------------------------------

  const reloadAll = useCallback(
    async (accountId: number, monthKey: string, monthsBack: number) => {
      // ① 月次残高（当月・前月）
      const prevMonthKey = ymToDate(ym(addMonths(new Date(monthKey), -1)));

      const thisSnap = await getMonthlyCashBalance({
        cash_account_id: accountId,
        month: monthKey,
      });

      const prevSnap = await getMonthlyCashBalance({
        cash_account_id: accountId,
        month: prevMonthKey,
      });

      setMonthlyBalance(Number(thisSnap?.balance ?? 0));
      setPrevMonthBalance(Number(prevSnap?.balance ?? 0));
      setCurrentBalance(Number(thisSnap?.balance ?? 0));

      // ② 今月の収入・支出
      const ie = await getMonthlyIncomeExpense({
        cash_account_id: accountId,
        month: monthKey,
      });
      setMonthIncome(Number(ie?.income ?? 0));
      setMonthExpense(Number(ie?.expense ?? 0));

      // ③ 当月の明細
      const flows = await getCashFlows({
        cash_account_id: accountId,
        month: monthKey,
      });
      setCashFlowsState(flows ?? []);

      // ④ チャート用（client select）
      const from = ymToDate(ym(addMonths(new Date(monthKey), -(monthsBack - 1))));
      const { data, error: qErr } = await supabase
        .from("monthly_cash_account_balances")
        .select("cash_account_id, month, income, expense, balance, updated_at, user_id")
        .eq("cash_account_id", accountId)
        .gte("month", from)
        .order("month", { ascending: true });

      if (qErr) throw qErr;
      setChartRows((data ?? []) as MonthlyCashBalanceRow[]);
    },
    [supabase]
  );

  // initial load
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const a = await getAccounts();
        setAccounts(a ?? []);
        if (!selectedAccountId && (a?.length ?? 0) > 0) {
          setSelectedAccountId(a![0].id);
        }

        const c = await getCashCategories();
        setCategories(c ?? []);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "初期ロードでエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload when selection changes
  useEffect(() => {
    if (!selectedAccountId) return;

    (async () => {
      try {
        setLoading(true);
        setError("");
        await reloadAll(selectedAccountId, ymToDate(currentMonth), range);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "再読み込みでエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAccountId, currentMonth, range, reloadAll]);

  // --- handlers -------------------------------------------------------------

  async function onCreate() {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError("");

      const ymdDate = normalizeYmd(formDate);

      // ✅ 先に必須チェック（ここで formCategoryId を number に確定させる）
      if (!formCategoryId) {
        throw new Error("カテゴリを選択してください（manual必須）");
      }
      if (!ymdDate || !/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) {
        throw new Error("日付が不正です（YYYY-MM-DD で入力してください）");
      }

      // ✅ ここ以降、formCategoryId は number として扱える（TSが納得する）
      const payload: CashFlowCreateInput = {
        cash_account_id: selectedAccountId,
        date: ymdDate,
        section: formSection,
        amount: Number(formAmount || 0),
        cash_category_id: formCategoryId,
        description: formMemo || null,
      };

      await createCashFlow(payload);
      console.log("created ok", payload);

      await reloadAll(selectedAccountId, ymToDate(currentMonth), range);
      console.log("reloaded");

      // 入力を軽くリセット（任意）
      setFormAmount(0);
      setFormMemo("");
      // setFormCategoryId(null); // 消したいなら解除
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
      `削除しますか?\n${row.date} / ${sectionLabel(row.section)} / ${yen(Number(row.amount ?? 0))}`
    );
    if (!ok) return;

    try {
      setLoading(true);
      setError("");

      await deleteCashFlow({
        id: row.id,
        cash_account_id: row.cash_account_id,
      });

      await reloadAll(selectedAccountId, ymToDate(currentMonth), range);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "削除中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  // --- derived --------------------------------------------------------------

  const overview: OverviewPayload = useMemo(
    () => ({
      currentBalance,
      thisMonthIncome: monthIncome,
      thisMonthExpense: monthExpense,
      net,
      monthlyBalance,
      monthlyDiff: monthlyBalance - prevMonthBalance,
    }),
    [currentBalance, monthIncome, monthExpense, net, monthlyBalance, prevMonthBalance]
  );

  // --- render ---------------------------------------------------------------

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Cashflow Dashboard</h2>
        <button onClick={onLogout}>Logout</button>
      </div>

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
          />{" "}
          Range:{" "}
          <select value={range} onChange={(e) => setRange(Number(e.target.value))} disabled={loading}>
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
            <option value={24}>last 24 months</option>
          </select>
        </div>
      </div>

      <hr style={{ marginTop: 16, opacity: 0.3 }} />

      {/* 入力 */}
      <div>
        <h3>入力（cash_flows）</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            日付{" "}
            <input
              type="date"
              value={normalizeYmd(formDate)}
              onChange={(e) => setFormDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            区分{" "}
            <select value={formSection} onChange={(e) => setFormSection(e.target.value as CashFlowSection)} disabled={loading}>
              <option value="in">in（収入）</option>
              <option value="out">out（支出）</option>
            </select>
          </div>

          <div>
            金額{" "}
            <input
              type="number"
              value={Number.isFinite(formAmount) ? formAmount : 0}
              onChange={(e) => setFormAmount(Number(e.target.value))}
              disabled={loading}
              style={{ width: 120 }}
            />
          </div>

          <div>
            カテゴリ（manual必須）{" "}
            <select
              value={formCategoryId ?? ""}
              onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : null)}
              disabled={loading}
            >
              <option value="">（選択）</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} / id:{c.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            メモ{" "}
            <input
              type="text"
              value={formMemo}
              onChange={(e) => setFormMemo(e.target.value)}
              disabled={loading}
              placeholder="任意"
              style={{ width: 220 }}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onCreate} disabled={loading} title="登録">
              登録
            </button>
            <button
              onClick={async () => {
                if (!selectedAccountId) return;
                try {
                  setLoading(true);
                  setError("");
                  await reloadAll(selectedAccountId, ymToDate(currentMonth), range);
                } catch (e: any) {
                  console.error(e);
                  setError(e?.message ?? "refreshでエラーが発生しました");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              title="refresh"
            >
              refresh
            </button>
          </div>
        </div>
      </div>

      <hr style={{ marginTop: 16, opacity: 0.3 }} />

      {/* Overview */}
      <div>
        <h3>Overview</h3>
        <div>Account: {selectedName || "-"}</div>
        <div>Current Balance: {yen(overview.currentBalance)}</div>
        <div>This Month Income: {yen(overview.thisMonthIncome)}</div>
        <div>This Month Expense: {yen(overview.thisMonthExpense)}</div>
        <div>Net: {yen(overview.net)}</div>

        <div style={{ marginTop: 8 }}>
          <div>月次残高</div>
          <div>{yen(overview.monthlyBalance)}</div>
          <div>前月比: {yen(overview.monthlyDiff)}</div>
        </div>
      </div>

      <hr style={{ marginTop: 16, opacity: 0.3 }} />

      {/* 当月明細 */}
      <div>
        <h3>当月の明細</h3>
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
                  <td style={{ textAlign: "right", paddingRight: 12 }}>{yen(Number(r.amount ?? 0))}</td>
                  <td style={{ paddingRight: 12 }}>{r.cash_category?.name ?? "-"}</td>
                  <td style={{ paddingRight: 12 }}>{r.description ?? ""}</td>
                  <td>
                    <button onClick={() => onDeleteCashFlow(r)} disabled={loading} title="削除">
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <hr style={{ marginTop: 16, opacity: 0.3 }} />

      {/* last N months */}
      <div>
        <h3>last {range} months</h3>
        {chartRows.length === 0 ? (
          <p>monthly_cash_account_balances に該当データがありません（RLS or データ未作成の可能性）</p>
        ) : (
          <table style={{ marginTop: 8, width: "100%", maxWidth: 720 }}>
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
                  <td style={{ textAlign: "right", paddingRight: 16 }}>{yen(Number(r.balance ?? 0))}</td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>{yen(Number(r.income ?? 0))}</td>
                  <td style={{ textAlign: "right" }}>{yen(Number(r.expense ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}