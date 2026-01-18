// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
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

// components（君の構成に合わせて）
import OverviewCard from "./_components/OverviewCard";

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
  return s === "in" ? "in (収入)" : "out (支出)";
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [range, setRange] = useState<number>(12);

  // input form
  const [flowDate, setFlowDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
  const [flowSection, setFlowSection] = useState<CashFlowSection>("in");
  const [flowAmount, setFlowAmount] = useState<number>(0);
  const [flowCategoryId, setFlowCategoryId] = useState<number | null>(null);
  const [flowDescription, setFlowDescription] = useState<string>("");

  const [categories, setCategories] = useState<CashCategory[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlowListRow[]>([]);

  // overview
  const [monthIncome, setMonthIncome] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);
  const [monthBalance, setMonthBalance] = useState<number>(0);
  const [prevMonthBalance, setPrevMonthBalance] = useState<number>(0);
  const [currentBalance, setCurrentBalance] = useState<number>(0);

  // charts
  const [chartRows, setChartRows] = useState<MonthlyCashBalanceRow[]>([]);

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
  }, [currentBalance, monthIncome, monthExpense, monthBalance, prevMonthBalance]);

  const reloadAll = useCallback(
    async (accountId: number, monthKey: string, monthsBack: number) => {
      // 1) 月次 balance（今月/前月）
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
      setCurrentBalance(Number(thisSnap?.balance ?? 0)); // “現在残高”を月次balanceとして暫定表示

      // 2) 今月の収入・支出
      const ie = await getMonthlyIncomeExpense({
        cash_account_id: accountId,
        month: monthKey,
      });
      setMonthIncome(Number(ie?.income ?? 0));
      setMonthExpense(Number(ie?.expense ?? 0));

      // 3) 当月の明細
      const flows = await getCashFlows({
        cash_account_id: accountId,
        month: monthKey,
      });
      setCashFlows(flows);

      // 4) チャート（client select）
      const from = ymToDate(ym(addMonths(new Date(monthKey), -(monthsBack - 1))));
      const { data, error: qErr } = await supabase
        .from("monthly_cash_account_balances")
        .select("cash_account_id, month, income, expense, balance")
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

        const accs = await getAccounts();
        setAccounts(accs);

        const firstId = accs[0]?.id ?? null;
        setSelectedAccountId(firstId);

        const cats = await getCashCategories();
        setCategories(cats);

        if (firstId != null) {
          const monthKey = ymToDate(ym(currentMonth));
          await reloadAll(firstId, monthKey, range);
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "初期化でエラーが発生しました");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = useCallback(async () => {
    if (selectedAccountId == null) return;
    try {
      setLoading(true);
      setError("");
      const monthKey = ymToDate(ym(currentMonth));
      await reloadAll(selectedAccountId, monthKey, range);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "更新でエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, currentMonth, range, reloadAll]);

  const onCreateCashFlow = useCallback(async () => {
    if (selectedAccountId == null) return;

    // manual必須なので category 無いと止める
    if (!flowCategoryId) {
      setError("カテゴリ（manual必須）を選択してください");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const payload: CashFlowCreateInput = {
        cash_account_id: selectedAccountId,
        date: flowDate,
        section: flowSection,
        amount: Number(flowAmount),
        cash_category_id: flowCategoryId,
        description: flowDescription || null,
        source_type: "manual",
      };

      await createCashFlow(payload);

      const monthKey = ymToDate(ym(currentMonth));
      await reloadAll(selectedAccountId, monthKey, range);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "登録でエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [
    selectedAccountId,
    flowCategoryId,
    flowDate,
    flowSection,
    flowAmount,
    flowDescription,
    currentMonth,
    range,
    reloadAll,
  ]);

  const onDeleteCashFlow = useCallback(
    async (row: CashFlowListRow) => {
      if (!selectedAccountId) return;

      const ok = window.confirm(
        `削除しますか?\n${row.date} / ${sectionLabel(row.section)} / ${yen(row.amount)}`
      );
      if (!ok) return;

      try {
        setLoading(true);
        setError("");

        await deleteCashFlow({
          id: row.id,
          cash_account_id: row.cash_account_id,
        });

        const monthKey = ymToDate(ym(currentMonth));
        await reloadAll(selectedAccountId, monthKey, range);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "削除中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    },
    [selectedAccountId, currentMonth, range, reloadAll]
  );

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
          Month: {ym(currentMonth)}月　
          Range:{" "}
          <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
            <option value={6}>last 6 months</option>
            <option value={12}>last 12 months</option>
            <option value={24}>last 24 months</option>
          </select>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <div>
        <div style={{ marginBottom: 8 }}>入力（cash_flows）</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            日付{" "}
            <input
              type="date"
              value={flowDate}
              onChange={(e) => setFlowDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            区分{" "}
            <select
              value={flowSection}
              onChange={(e) => setFlowSection(e.target.value as CashFlowSection)}
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
              value={flowAmount}
              onChange={(e) => setFlowAmount(Number(e.target.value))}
              disabled={loading}
              style={{ width: 120 }}
            />
          </div>

          <div>
            カテゴリ（manual必須）{" "}
            <select
              value={flowCategoryId ?? ""}
              onChange={(e) => setFlowCategoryId(Number(e.target.value))}
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
              value={flowDescription}
              onChange={(e) => setFlowDescription(e.target.value)}
              disabled={loading}
              placeholder="任意"
              style={{ width: 240 }}
            />
          </div>

          <button onClick={onCreateCashFlow} disabled={loading}>
            登録
          </button>

          <button onClick={onRefresh} disabled={loading}>
            refresh
          </button>
        </div>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <OverviewCard accountName={selectedName} payload={overviewPayload} />

      <div style={{ marginTop: 16 }}>
        <div className="font-semibold">当月の明細</div>
        {cashFlows.length === 0 ? (
          <div>当月の cash_flows がありません</div>
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
                <td style={{ textAlign: "right", paddingRight: 16 }}>{yen(Number(r.balance ?? 0))}</td>
                <td style={{ textAlign: "right", paddingRight: 16 }}>{yen(Number(r.income ?? 0))}</td>
                <td style={{ textAlign: "right" }}>{yen(Number(r.expense ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}