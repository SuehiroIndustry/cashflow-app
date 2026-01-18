// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";

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

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // master data
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);

  // selection
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [currentMonth, setCurrentMonth] = useState<string>(() => ym(new Date()));
  const [range, setRange] = useState<number>(12);

  // overview numbers
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [monthIncome, setMonthIncome] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);
  const [monthBalance, setMonthBalance] = useState<number>(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState<number>(0);

  // lists / charts
  const [cashFlows, setCashFlows] = useState<CashFlowListRow[]>([]);
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);

  // form (create cash flow)
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
  const [formSection, setFormSection] = useState<CashFlowSection>("in");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formMemo, setFormMemo] = useState<string>("");

  const selectedName = useMemo(() => {
    const a = accounts.find((x) => x.id === selectedAccountId);
    return a?.name ?? "";
  }, [accounts, selectedAccountId]);

  const overviewPayload: OverviewPayload = useMemo(() => {
    const net = monthIncome - monthExpense;
    const monthlyDiff = monthBalance - prevMonthBalance;

    return {
      currentBalance,
      thisMonthIncome: monthIncome,
      thisMonthExpense: monthExpense,
      net,
      monthlyBalance: monthBalance,
      monthlyDiff,
    };
  }, [
    currentBalance,
    monthIncome,
    monthExpense,
    monthBalance,
    prevMonthBalance,
  ]);

  const reloadAll = useCallback(
    async (accountId: number, monthKey: string, monthsBack: number) => {
      // prev month
      const prevMonthKey = ymToDate(ym(addMonths(new Date(monthKey), -1)));

      // ① balances
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

      // ② income/expense
      const ie = await getMonthlyIncomeExpense({
        cash_account_id: accountId,
        month: monthKey,
      });

      setMonthIncome(Number(ie?.income ?? 0));
      setMonthExpense(Number(ie?.expense ?? 0));

      // ③ flows
      const flows = await getCashFlows({
        cash_account_id: accountId,
        month: monthKey.slice(0, 7), // YYYY-MM
      });
      setCashFlows(flows);

      // ④ chart rows (client select)
      const from = ymToDate(ym(addMonths(new Date(monthKey), -(monthsBack - 1))));
      const { data, error: qErr } = await supabase
        .from("monthly_cash_account_balances")
        .select("cash_account_id, month, income, expense, balance, updated_at")
        .eq("cash_account_id", accountId)
        .gte("month", from)
        .order("month", { ascending: true });

      if (qErr) throw qErr;

      setChartRows((data ?? []) as MonthlyCashBalanceRow[]);
    },
    [supabase]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const [acc, cats] = await Promise.all([getAccounts(), getCashCategories()]);

        setAccounts(acc ?? []);
        setCategories(cats ?? []);

        if ((acc ?? []).length > 0) {
          const firstId = (acc ?? [])[0].id;
          setSelectedAccountId(firstId);
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "初期化でエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedAccountId) return;

      try {
        setLoading(true);
        setError("");
        await reloadAll(selectedAccountId, ymToDate(currentMonth), range);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "読み込みでエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAccountId, currentMonth, range, reloadAll]);

  async function onCreate() {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setError("");

      const payload: CashFlowCreateInput = {
        cash_account_id: selectedAccountId,
        date: formDate,
        section: formSection,
        amount: Number(formAmount || 0),
        cash_category_id: Number(formCategoryId || 0),
        description: formMemo || null,
      };

      // manual 必須の想定なので category は必須チェック
      if (!payload.cash_category_id) {
        throw new Error("カテゴリを選択してください（manual必須）");
      }

      await createCashFlow(payload);

      // reload
      await reloadAll(selectedAccountId, ymToDate(currentMonth), range);
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
      `削除しますか?\n${row.date} / ${sectionLabel(row.section)} / ${yen(
        row.amount
      )}`
    );
    if (!ok) return;

    try {
      setLoading(true);
      setError("");

      await deleteCashFlow({
        id: row.id,
        cash_account_id: row.cash_account_id,
      });

      const monthKey = ymToDate(currentMonth);
      await reloadAll(selectedAccountId, monthKey, range);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "削除中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Cashflow Dashboard</h2>

      {error ? (
        <p style={{ color: "tomato" }}>Error: {error}</p>
      ) : null}

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

        <div>
          Month:{" "}
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            disabled={loading}
          >
            {Array.from({ length: 18 }).map((_, i) => {
              const d = addMonths(new Date(), -i);
              const key = ym(d);
              return (
                <option key={key} value={key}>
                  {key.replace("-", "年")}月
                </option>
              );
            })}
          </select>

          <span style={{ marginLeft: 12 }}>Range: </span>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value))}
            disabled={loading}
          >
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
            <option value={18}>last 18 months</option>
          </select>
        </div>
      </div>

      <hr style={{ marginTop: 16 }} />

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600 }}>入力（cash_flows）</div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div>
            日付{" "}
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            区分{" "}
            <select
              value={formSection}
              onChange={(e) => setFormSection(e.target.value as CashFlowSection)}
              disabled={loading}
            >
              <option value="in">in（収入）</option>
              <option value="out">out（支出）</option>
            </select>
          </div>

          <div>
            金額{" "}
            <input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value))}
              disabled={loading}
            />
          </div>

          <div>
            カテゴリ（manual必須）{" "}
            <select
              value={formCategoryId ?? ""}
              onChange={(e) => setFormCategoryId(Number(e.target.value))}
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
              placeholder="任意"
              disabled={loading}
            />
          </div>

          <button onClick={onCreate} disabled={loading || !selectedAccountId}>
            登録
          </button>

          <button
            onClick={() => router.refresh()}
            disabled={loading}
            style={{ marginLeft: 8 }}
          >
            refresh
          </button>
        </div>
      </div>

      <hr style={{ marginTop: 16 }} />

      <div style={{ marginTop: 16 }}>
        <OverviewCard accountName={selectedName} payload={overviewPayload} />
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600 }}>当月の明細</div>

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
                  <td style={{ paddingRight: 12 }}>
                    {sectionLabel(r.section)}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 12 }}>
                    {yen(Number(r.amount ?? 0))}
                  </td>
                  <td style={{ paddingRight: 12 }}>
                    {r.cash_category?.name ?? "-"}
                  </td>
                  <td style={{ paddingRight: 12 }}>{r.description ?? ""}</td>
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
      </div>

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
              <th style={{ textAlign: "right", paddingRight: 16 }}>Expense</th>
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
                <td style={{ textAlign: "right", paddingRight: 16 }}>
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