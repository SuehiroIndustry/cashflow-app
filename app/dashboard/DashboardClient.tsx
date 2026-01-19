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
import { getMonthlyCashBalance } from "@/app/dashboard/_actions/getMonthlyCashBalance";
import { getMonthlyIncomeExpense } from "@/app/dashboard/_actions/getMonthlyIncomeExpense";

// types（ルール：_types からのみ）
import type {
  CashAccount,
  CashCategory,
  CashFlowCreateInput,
  CashFlowListRow,
  CashFlowSection,
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
  if (!/^\d{4}-\d{2}$/.test(ymStr)) throw new Error("Invalid month format");
  return `${ymStr}-01`;
}

function normalizeYmd(s: string) {
  // input type="date" が基本 "YYYY-MM-DD"。念のためガード
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("日付が不正です（YYYY-MM-DD）");
  return s;
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

  // master
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [categories, setCategories] = useState<CashCategory[]>([]);

  // selection
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [currentMonth, setCurrentMonth] = useState<string>(() => ym(new Date())); // "YYYY-MM"
  const [range, setRange] = useState<number>(12);

  // data
  const [cashFlows, setCashFlows] = useState<CashFlowListRow[]>([]);
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);
  const [incomeExpense, setIncomeExpense] = useState<MonthlyIncomeExpenseRow>({
    income: 0,
    expense: 0,
  });
  const [overview, setOverview] = useState<OverviewPayload | null>(null);

  // ui
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // form
  const [formDate, setFormDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
  });
  const [formSection, setFormSection] = useState<CashFlowSection>("in");
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formMemo, setFormMemo] = useState<string>("");

  const accountName = useMemo(() => {
    const a = accounts.find((x) => x.id === selectedAccountId);
    return a?.name ?? "";
  }, [accounts, selectedAccountId]);

  const monthKey = useMemo(() => {
    // actions に渡すのは常に "YYYY-MM-01"
    return ymToMonthKey(currentMonth);
  }, [currentMonth]);

  const reloadAll = useCallback(
    async (cash_account_id: number, monthYYYYMM01: string, rangeN: number) => {
      // monthYYYYMM01 は "YYYY-MM-01" 前提
      const [flows, rows, ie] = await Promise.all([
        getCashFlows({ cash_account_id, month: monthYYYYMM01 }),
        getMonthlyCashBalance({ cash_account_id, month: monthYYYYMM01, range: rangeN }),
        getMonthlyIncomeExpense({ cash_account_id, month: monthYYYYMM01 }),
      ]);

      setCashFlows(flows);
      setChartRows(rows ?? []); // null なら []
      setIncomeExpense(ie);

      // overview は「今月の収入/支出＋差分」など、ここでは最低限組み立て
      const income = ie.income ?? 0;
      const expense = ie.expense ?? 0;
      const net = income - expense;

      // currentBalance / monthlyBalance などは rows から作る（存在しなければ0）
      const latest = (rows ?? [])[0];
      const currentBalance = latest?.balance ?? 0;

      const payload: OverviewPayload = {
        currentBalance,
        thisMonthIncome: income,
        thisMonthExpense: expense,
        net,
        monthlyBalance: currentBalance,
        monthlyDiff: 0, // 必要なら rows[0]-rows[1] で出す
      };
      setOverview(payload);
    },
    []
  );

  // initial load (accounts + categories)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const [accs, cats] = await Promise.all([getAccounts(), getCashCategories()]);
        setAccounts(accs);
        setCategories(cats);

        const firstId = accs?.[0]?.id ?? null;
        setSelectedAccountId(firstId);

        if (firstId !== null) {
          await reloadAll(firstId, monthKey, range);
        }
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "初期ロードに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when selection changes
  useEffect(() => {
    (async () => {
      try {
        if (selectedAccountId === null) return;
        setLoading(true);
        setErrorMsg("");
        await reloadAll(selectedAccountId, monthKey, range);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "更新に失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedAccountId, monthKey, range, reloadAll]);

  const onCreate = useCallback(async () => {
    if (selectedAccountId === null) return;

    try {
      setLoading(true);
      setErrorMsg("");

      const ymdDate = normalizeYmd(formDate);

      const payload: CashFlowCreateInput = {
        cash_account_id: selectedAccountId, // ✅ number のまま
        date: ymdDate,
        section: formSection,
        amount: Number(formAmount || 0),
        cash_category_id: formCategoryId, // ✅ number | null のまま
        description: formMemo || null,
        source_type: "manual",
      };

      // manual の場合はカテゴリ必須（あなたのルール）
      if (payload.source_type === "manual" && !payload.cash_category_id) {
        throw new Error("カテゴリを選択してください（manual必須）");
      }

      await createCashFlow(payload);

      // reload
      await reloadAll(selectedAccountId, monthKey, range);

      // フォーム軽くリセット（任意）
      setFormAmount(0);
      setFormMemo("");
      // setFormCategoryId(null); // ここは好み。毎回消すなら有効化
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "登録中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [
    selectedAccountId,
    formDate,
    formSection,
    formAmount,
    formCategoryId,
    formMemo,
    reloadAll,
    monthKey,
    range,
  ]);

  const onDeleteCashFlowRow = useCallback(
    async (row: CashFlowListRow) => {
      if (selectedAccountId === null) return;

      const ok = window.confirm(
        `削除しますか？\n${row.date} / ${sectionLabel(row.section)} / ${yen(
          Number(row.amount ?? 0)
        )}`
      );
      if (!ok) return;

      try {
        setLoading(true);
        setErrorMsg("");

        await deleteCashFlow({
          id: row.id,
          cash_account_id: selectedAccountId,
        });

        await reloadAll(selectedAccountId, monthKey, range);
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "削除に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [selectedAccountId, reloadAll, monthKey, range]
  );

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Cashflow Dashboard</div>

      {errorMsg ? (
        <div style={{ color: "salmon", marginBottom: 12 }}>
          Error: {errorMsg}
        </div>
      ) : null}

      {/* controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div>
          Account:&nbsp;
          <select
            value={selectedAccountId ?? ""}
            onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
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
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            placeholder="YYYY-MM"
          />
        </div>

        <div>
          Range:&nbsp;
          <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <option value={3}>last 3 months</option>
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
            <option value={24}>last 24 months</option>
          </select>
        </div>

        <button onClick={() => router.refresh()} disabled={loading}>
          refresh
        </button>
      </div>

      <hr />

      {/* create */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>入力（cash_flows）</div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            日付&nbsp;
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
          </div>

          <div>
            区分&nbsp;
            <select value={formSection} onChange={(e) => setFormSection(e.target.value as any)}>
              <option value="in">in（収入）</option>
              <option value="out">out（支出）</option>
            </select>
          </div>

          <div>
            金額&nbsp;
            <input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value))}
              style={{ width: 120 }}
            />
          </div>

          <div>
            カテゴリ（manual必須）&nbsp;
            <select
              value={formCategoryId ?? ""}
              onChange={(e) =>
                setFormCategoryId(e.target.value ? Number(e.target.value) : null)
              }
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
            />
          </div>

          <button disabled={loading || selectedAccountId === null} onClick={onCreate}>
            登録
          </button>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      {/* overview */}
      <div style={{ marginTop: 12 }}>
        <OverviewCard accountName={accountName} payload={overview ?? undefined} />
      </div>

      {/* list */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>当月の明細</div>

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
                <th />
              </tr>
            </thead>
            <tbody>
              {cashFlows.map((r) => (
                <tr key={r.id}>
                  <td style={{ paddingRight: 12 }}>{r.date}</td>
                  <td style={{ paddingRight: 12 }}>{sectionLabel(r.section)}</td>
                  <td style={{ paddingRight: 12, textAlign: "right" }}>
                    {yen(Number(r.amount ?? 0))}
                  </td>
                  <td style={{ paddingRight: 12 }}>{r.cash_category?.name ?? "-"}</td>
                  <td style={{ paddingRight: 12 }}>{r.description ?? "-"}</td>
                  <td>
                    <button
                      onClick={() => onDeleteCashFlowRow(r)}
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

      {/* charts */}
      <div style={{ marginTop: 16 }}>
        <h3>last {range} months</h3>

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