// app/dashboard/DashboardClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// components
import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

// actions
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getCashCategories } from "@/app/dashboard/_actions/getCashCategories";
import { getCashFlows } from "@/app/dashboard/_actions/getCashFlows";
import { createCashFlow } from "@/app/dashboard/_actions/createCashFlow";
import { deleteCashFlow } from "@/app/dashboard/_actions/deleteCashFlow";
import { updateCashFlow } from "@/app/dashboard/_actions/updateCashFlow";
import { getMonthlyCashBalance } from "@/app/dashboard/_actions/getMonthlyCashBalance";
import { getMonthlyIncomeExpense } from "@/app/dashboard/_actions/getMonthlyIncomeExpense";

// types（ルール：_types からだけ）
import type {
  CashAccount,
  CashCategory,
  CashFlowCreateInput,
  CashFlowListRow,
  CashFlowSection,
  CashFlowUpdateInput,
  MonthlyCashBalanceRow,
  MonthlyIncomeExpenseRow,
  OverviewPayload,
} from "./_types";

function ym(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // "YYYY-MM"
}

function ymToMonthKey(ymStr: string) {
  // "YYYY-MM" -> "YYYY-MM-01"
  if (!/^\d{4}-\d{2}$/.test(ymStr)) throw new Error("Invalid ym format");
  return `${ymStr}-01`;
}

function normalizeYmd(s: string) {
  // input type="date" は基本 YYYY-MM-DD だが保険
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

function yen(n: number) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return `¥${v.toLocaleString()}`;
}

function sectionLabel(s: CashFlowSection) {
  return s === "in" ? "収入" : "支出";
}

export default function DashboardClient() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [range, setRange] = useState<number>(12);

  const monthKey = useMemo(() => ymToMonthKey(ym(currentMonth)), [currentMonth]);
  const rangeN = useMemo(() => Math.max(1, Math.min(60, Math.floor(range || 12))), [range]);

  const [cashFlows, setCashFlows] = useState<CashFlowListRow[]>([]);
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);
  const [incomeExpense, setIncomeExpense] = useState<MonthlyIncomeExpenseRow | null>(null);

  const overview: OverviewPayload | null = useMemo(() => {
    const currentBalance = chartRows.length ? Number(chartRows[chartRows.length - 1].balance ?? 0) : 0;
    const thisMonthIncome = Number(incomeExpense?.income ?? 0);
    const thisMonthExpense = Number(incomeExpense?.expense ?? 0);
    const net = thisMonthIncome - thisMonthExpense;

    const monthlyBalance = Number(chartRows.length ? chartRows[chartRows.length - 1].balance ?? 0 : 0);
    const prevBalance = chartRows.length >= 2 ? Number(chartRows[chartRows.length - 2].balance ?? 0) : 0;
    const monthlyDiff = monthlyBalance - prevBalance;

    return {
      currentBalance,
      thisMonthIncome,
      thisMonthExpense,
      net,
      monthlyBalance,
      monthlyDiff,
    };
  }, [chartRows, incomeExpense]);

  // create form
  const [formDate, setFormDate] = useState<string>(() => normalizeYmd(new Date().toISOString().slice(0, 10)));
  const [formSection, setFormSection] = useState<CashFlowSection>("in");
  const [formAmount, setFormAmount] = useState<string>("0");
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formMemo, setFormMemo] = useState<string>("");

  // edit state (inline)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editSection, setEditSection] = useState<CashFlowSection>("in");
  const [editAmount, setEditAmount] = useState<string>("0");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editMemo, setEditMemo] = useState<string>("");

  const loadBase = useCallback(async () => {
    const [acc, cats] = await Promise.all([getAccounts(), getCashCategories()]);
    setAccounts(acc);
    setCategories(cats);

    if (acc.length && selectedAccountId == null) {
      setSelectedAccountId(acc[0].id);
    }
  }, [selectedAccountId]);

  const reloadAll = useCallback(async (cash_account_id: number, monthYYYYMM01: string, rangeN: number) => {
    const [flows, rows, ie] = await Promise.all([
      getCashFlows({ cash_account_id, month: monthYYYYMM01 }),
      getMonthlyCashBalance({ cash_account_id, month: monthYYYYMM01, range: rangeN }),
      getMonthlyIncomeExpense({ cash_account_id, month: monthYYYYMM01 }),
    ]);

    setCashFlows(flows);
    setChartRows(rows);
    setIncomeExpense(ie);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        await loadBase();
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "初期ロードに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadBase]);

  useEffect(() => {
    (async () => {
      if (!selectedAccountId) return;
      try {
        setLoading(true);
        setErrorMsg("");
        await reloadAll(selectedAccountId, monthKey, rangeN);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "データ取得に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAccountId, monthKey, rangeN, reloadAll]);

  async function onCreate() {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const ymdDate = normalizeYmd(formDate);

      // manual 必須ルール
      if (!formCategoryId) throw new Error("カテゴリを選択してください（manual必須）");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) throw new Error("日付が不正です（YYYY-MM-DD）");

      const payload: CashFlowCreateInput = {
        cash_account_id: selectedAccountId,
        date: ymdDate,
        section: formSection,
        amount: Number(formAmount || 0),
        cash_category_id: formCategoryId,
        description: formMemo || null,
        source_type: "manual",
      };

      await createCashFlow(payload);
      await reloadAll(selectedAccountId, monthKey, rangeN);

      setFormAmount("0");
      setFormMemo("");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "登録中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(row: CashFlowListRow) {
    setErrorMsg("");
    setEditingId(row.id);
    setEditDate(row.date);
    setEditSection(row.section);
    setEditAmount(String(Number(row.amount ?? 0)));
    setEditCategoryId(row.cash_category_id ?? row.cash_category?.id ?? null);
    setEditMemo(row.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDate("");
    setEditSection("in");
    setEditAmount("0");
    setEditCategoryId(null);
    setEditMemo("");
  }

  async function onSaveEdit(row: CashFlowListRow) {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const ymdDate = normalizeYmd(editDate);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdDate)) throw new Error("日付が不正です（YYYY-MM-DD）");
      if (!editCategoryId) throw new Error("カテゴリを選択してください（manual必須）");

      const amountNum = Number(editAmount || 0);
      if (!Number.isFinite(amountNum)) throw new Error("金額が不正です");

      const payload: CashFlowUpdateInput = {
        id: row.id,
        cash_account_id: selectedAccountId,
        date: ymdDate,
        section: editSection,
        amount: amountNum,
        cash_category_id: editCategoryId,
        description: editMemo ? editMemo : null,
      };

      await updateCashFlow(payload);
      await reloadAll(selectedAccountId, monthKey, rangeN);

      cancelEdit();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "更新中にエラーが発生しました");
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
      setErrorMsg("");

      await deleteCashFlow({
        id: row.id,
        cash_account_id: selectedAccountId,
      });

      await reloadAll(selectedAccountId, monthKey, rangeN);

      if (editingId === row.id) cancelEdit();
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "削除中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  const accountName = useMemo(() => {
    const a = accounts.find((x) => x.id === selectedAccountId);
    return a?.name ?? "-";
  }, [accounts, selectedAccountId]);

  return (
    <div style={{ padding: 24 }}>
      <h1>Cashflow Dashboard</h1>

      {errorMsg ? (
        <div style={{ color: "tomato", marginTop: 8, whiteSpace: "pre-wrap" }}>{errorMsg}</div>
      ) : null}

      <div style={{ marginTop: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          Account:&nbsp;
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
            disabled={loading}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </div>

        <div>
          Month:&nbsp;
          <input
            type="month"
            value={ym(currentMonth)}
            onChange={(e) => {
              const v = e.target.value; // "YYYY-MM"
              if (!/^\d{4}-\d{2}$/.test(v)) return;
              const d = new Date(`${v}-01T00:00:00`);
              setCurrentMonth(d);
            }}
            disabled={loading}
          />
        </div>

        <div>
          Range:&nbsp;
          <select value={rangeN} onChange={(e) => setRange(Number(e.target.value))} disabled={loading}>
            {[3, 6, 12, 24].map((n) => (
              <option key={n} value={n}>
                last {n} months
              </option>
            ))}
          </select>
        </div>

        <button onClick={() => router.refresh()} disabled={loading}>
          refresh
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {/* input row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          日付&nbsp;
          <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
        </div>

        <div>
          区分&nbsp;
          <select value={formSection} onChange={(e) => setFormSection(e.target.value as CashFlowSection)}>
            <option value="in">収入</option>
            <option value="out">支出</option>
          </select>
        </div>

        <div>
          金額&nbsp;
          <input value={formAmount} onChange={(e) => setFormAmount(e.target.value)} style={{ width: 120 }} />
        </div>

        <div>
          カテゴリ（manual必須）&nbsp;
          <select
            value={formCategoryId ?? ""}
            onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : null)}
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
          メモ&nbsp;
          <input
            value={formMemo}
            onChange={(e) => setFormMemo(e.target.value)}
            placeholder="任意"
            style={{ width: 240 }}
          />
        </div>

        <button disabled={loading || !selectedAccountId} onClick={onCreate}>
          登録
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <div style={{ marginTop: 12 }}>
        <OverviewCard accountName={accountName} payload={overview ?? undefined} />
      </div>

      <div style={{ marginTop: 12, fontWeight: 600 }}>当月の明細</div>

      {cashFlows.length === 0 ? (
        <div>当月の cash_flows がありません</div>
      ) : (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th style={{ paddingRight: 12, textAlign: "left" }}>Date</th>
              <th style={{ paddingRight: 12, textAlign: "left" }}>Section</th>
              <th style={{ paddingRight: 12, textAlign: "right" }}>Amount</th>
              <th style={{ paddingRight: 12, textAlign: "left" }}>Category</th>
              <th style={{ paddingRight: 12, textAlign: "left" }}>Memo</th>
              <th style={{ paddingRight: 12, textAlign: "left" }}></th>
            </tr>
          </thead>
          <tbody>
            {cashFlows.map((r) => {
              const isEditing = editingId === r.id;

              if (!isEditing) {
                return (
                  <tr key={r.id}>
                    <td style={{ paddingRight: 12 }}>{r.date}</td>
                    <td style={{ paddingRight: 12 }}>{sectionLabel(r.section)}</td>
                    <td style={{ paddingRight: 12, textAlign: "right" }}>{yen(Number(r.amount ?? 0))}</td>
                    <td style={{ paddingRight: 12 }}>{r.cash_category?.name ?? "-"}</td>
                    <td style={{ paddingRight: 12 }}>{r.description ?? ""}</td>
                    <td style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEdit(r)} disabled={loading} title="編集">
                        編集
                      </button>
                      <button onClick={() => onDeleteCashFlow(r)} disabled={loading} title="削除">
                        削除
                      </button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={r.id}>
                  <td style={{ paddingRight: 12 }}>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  </td>

                  <td style={{ paddingRight: 12 }}>
                    <select value={editSection} onChange={(e) => setEditSection(e.target.value as CashFlowSection)}>
                      <option value="in">収入</option>
                      <option value="out">支出</option>
                    </select>
                  </td>

                  <td style={{ paddingRight: 12, textAlign: "right" }}>
                    <input
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      style={{ width: 140, textAlign: "right" }}
                    />
                  </td>

                  <td style={{ paddingRight: 12 }}>
                    <select
                      value={editCategoryId ?? ""}
                      onChange={(e) => setEditCategoryId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">（選択）</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} / id:{c.id}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ paddingRight: 12 }}>
                    <input
                      value={editMemo}
                      onChange={(e) => setEditMemo(e.target.value)}
                      placeholder="任意"
                      style={{ width: 240 }}
                    />
                  </td>

                  <td style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onSaveEdit(r)} disabled={loading} title="保存">
                      保存
                    </button>
                    <button onClick={cancelEdit} disabled={loading} title="キャンセル">
                      キャンセル
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <hr style={{ margin: "16px 0" }} />

      {/* charts */}
      <div style={{ marginTop: 16 }}>
        <h3>last {rangeN} months</h3>

        {chartRows.length === 0 ? (
          <p>monthly_cash_account_balances に該当データがありません（RLS or データ未作成の可能性）</p>
        ) : (
          <>
            <BalanceCard rows={chartRows} />
            <EcoCharts rows={chartRows} />
          </>
        )}
      </div>
    </div>
  );
}