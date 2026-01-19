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

// types（ルール：_types からだけ）
import type {
  CashAccount,
  CashCategory,
  CashFlowCreateInput,
  CashFlowListRow,
  CashFlowSection,
  MonthlyCashBalanceRow,
  OverviewPayload,
  MonthlyIncomeExpenseRow,
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

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function yen(n: number) {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return `¥${v.toLocaleString()}`;
}

function sectionLabel(s: CashFlowSection) {
  return s === "in" ? "収入" : "支出";
}

type UiCashFlowDraft = {
  date: string;
  section: CashFlowSection;
  amountText: string; // inputは文字列で持つ
  categoryIdText: string; // 未選択は "" 推奨
  description: string;
  sourceType: "manual";
};

function validateDraft(d: UiCashFlowDraft) {
  const errors: string[] = [];

  const date = normalizeYmd(d.date);
  if (!date || !isYmd(date)) errors.push("日付が不正です（YYYY-MM-DD）");

  const amount = Number(d.amountText);
  if (!Number.isFinite(amount)) errors.push("金額が数値ではありません");
  if (Number.isFinite(amount) && amount <= 0) errors.push("金額は1以上にしてください");

  // manual時のカテゴリ必須（DB制約に合わせる）
  if (d.sourceType === "manual" && !d.categoryIdText) {
    errors.push("カテゴリを選択してください（manual必須）");
  }

  return { ok: errors.length === 0, errors, amount, date };
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
    const prevBalance =
      chartRows.length >= 2 ? Number(chartRows[chartRows.length - 2].balance ?? 0) : 0;
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

  // form
  const [formDate, setFormDate] = useState<string>(() => normalizeYmd(new Date().toISOString().slice(0, 10)));
  const [formSection, setFormSection] = useState<CashFlowSection>("in");
  const [formAmountText, setFormAmountText] = useState<string>(""); // ★ stringで持つ
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formMemo, setFormMemo] = useState<string>("");

  const formSourceType: "manual" = "manual";

  const canSubmit = useMemo(() => {
    const draft: UiCashFlowDraft = {
      date: formDate,
      section: formSection,
      amountText: formAmountText,
      categoryIdText: formCategoryId ? String(formCategoryId) : "",
      description: formMemo,
      sourceType: formSourceType,
    };
    return validateDraft(draft).ok;
  }, [formDate, formSection, formAmountText, formCategoryId, formMemo, formSourceType]);

  const loadBase = useCallback(async () => {
    const [acc, cats] = await Promise.all([getAccounts(), getCashCategories()]);
    setAccounts(acc);
    setCategories(cats);

    if (acc.length && selectedAccountId == null) {
      setSelectedAccountId(acc[0].id);
    }
  }, [selectedAccountId]);

  const reloadAll = useCallback(
    async (cash_account_id: number, monthYYYYMM01: string, rangeN: number) => {
      const [flows, rows, ie] = await Promise.all([
        getCashFlows({ cash_account_id, month: monthYYYYMM01 }),
        getMonthlyCashBalance({ cash_account_id, month: monthYYYYMM01, range: rangeN }),
        getMonthlyIncomeExpense({ cash_account_id, month: monthYYYYMM01 }),
      ]);

      setCashFlows(flows);
      setChartRows(rows);
      setIncomeExpense(ie);
    },
    []
  );

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

    const draft: UiCashFlowDraft = {
      date: formDate,
      section: formSection,
      amountText: formAmountText,
      categoryIdText: formCategoryId ? String(formCategoryId) : "",
      description: formMemo,
      sourceType: "manual",
    };

    const v = validateDraft(draft);
    if (!v.ok) {
      setErrorMsg(v.errors[0]);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");

      const payload: CashFlowCreateInput = {
        cash_account_id: selectedAccountId,
        date: v.date,
        section: draft.section,
        amount: v.amount,
        cash_category_id: Number(draft.categoryIdText),
        description: draft.description || null,
        source_type: "manual",
      };

      await createCashFlow(payload);
      await reloadAll(selectedAccountId, monthKey, rangeN);

      // reset（任意）
      setFormAmountText("");
      setFormMemo("");
      // setFormCategoryId(null);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "登録中にエラーが発生しました");
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
          <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} disabled={loading} />
        </div>

        <div>
          区分&nbsp;
          <select
            value={formSection}
            onChange={(e) => setFormSection(e.target.value as CashFlowSection)}
            disabled={loading}
          >
            <option value="in">収入</option>
            <option value="out">支出</option>
          </select>
        </div>

        <div>
          金額&nbsp;
          <input
            value={formAmountText}
            onChange={(e) => setFormAmountText(e.target.value)}
            style={{ width: 120 }}
            inputMode="numeric"
            disabled={loading}
            placeholder="例: 1000"
          />
        </div>

        <div>
          カテゴリ（manual必須）&nbsp;
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
          メモ&nbsp;
          <input
            value={formMemo}
            onChange={(e) => setFormMemo(e.target.value)}
            placeholder="任意"
            style={{ width: 240 }}
            disabled={loading}
          />
        </div>

        <button disabled={loading || !selectedAccountId || !canSubmit} onClick={onCreate}>
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
            {cashFlows.map((r) => (
              <tr key={r.id}>
                <td style={{ paddingRight: 12 }}>{r.date}</td>
                <td style={{ paddingRight: 12 }}>{sectionLabel(r.section)}</td>
                <td style={{ paddingRight: 12, textAlign: "right" }}>{yen(Number(r.amount ?? 0))}</td>
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