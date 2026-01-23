// app/transactions/transactions-client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { getAccounts } from "../dashboard/_actions/getAccounts";
import { getCashCategories } from "./_actions/getCashCategories";
import { createCashFlow } from "./_actions/createCashFlow";
import { getRecentCashFlows } from "./_actions/getRecentCashFlows";

import type {
  Option,
  CashFlowCreateInput,
  RecentCashFlowRow,
  CashFlowSection,
} from "./_types";

function yen(n: number) {
  return `¥${Math.trunc(n).toLocaleString()}`;
}

function SectionBadge({ section }: { section: CashFlowSection }) {
  const cls =
    section === "in"
      ? "border-emerald-500/60 text-emerald-200 bg-emerald-500/10"
      : "border-red-500/60 text-red-200 bg-red-500/10";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs border rounded ${cls}`}>
      {section === "in" ? "収入" : "支出"}
    </span>
  );
}

export default function TransactionsClient() {
  const [accounts, setAccounts] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);

  const [cashAccountId, setCashAccountId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [section, setSection] = useState<CashFlowSection>("in");
  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>("");

  const [rows, setRows] = useState<RecentCashFlowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const selectedAccountName = useMemo(() => {
    if (!cashAccountId) return "";
    return accounts.find((a) => a.id === cashAccountId)?.name ?? "";
  }, [accounts, cashAccountId]);

  const loadBase = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const acc = await getAccounts();
      setAccounts(acc.map((a: any) => ({ id: a.id, name: a.name })));

      const nextAccountId =
        cashAccountId != null ? cashAccountId : acc.length ? acc[0].id : null;

      setCashAccountId(nextAccountId);

      const cats = await getCashCategories();
      setCategories(cats);

      setCashCategoryId((prev) => {
        if (prev != null) return prev;
        return cats.length ? cats[0].id : null;
      });

      if (nextAccountId != null) {
        const recent = await getRecentCashFlows({ cashAccountId: nextAccountId, limit: 30 });
        setRows(recent);
      } else {
        setRows([]);
      }
    } catch (e: any) {
      setMessage(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [cashAccountId]);

  const reloadRecent = useCallback(async () => {
    if (!cashAccountId) return;
    const recent = await getRecentCashFlows({ cashAccountId, limit: 30 });
    setRows(recent);
  }, [cashAccountId]);

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cashAccountId) return;
    void reloadRecent();
  }, [cashAccountId, reloadRecent]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!cashAccountId) {
      setMessage("口座が未選択です");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }

    if (!cashCategoryId) {
      setMessage("カテゴリが未選択です（manualは必須）");
      return;
    }

    const payload: CashFlowCreateInput = {
      cashAccountId,
      date,
      section,
      amount: amountNum,
      cashCategoryId,
      description: description.trim() ? description.trim() : null,
      sourceType: "manual" as const,
    };

    try {
      setSubmitting(true);
      await createCashFlow(payload);

      setMessage("登録しました");
      setDescription("");
      setAmount("1000");

      await reloadRecent();
    } catch (e: any) {
      setMessage(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold">Transactions</div>
        <div className="text-sm opacity-70">実務用：最短入力 → 即反映 → 直近が見える</div>
      </div>

      <div className="border rounded p-4 bg-black/20">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm opacity-80 w-10">口座</label>
              <select
                className="border rounded px-2 py-1 bg-transparent min-w-[220px]"
                value={cashAccountId ?? ""}
                onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} / id:{a.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm opacity-80 w-10">日付</label>
              <input
                type="date"
                className="border rounded px-2 py-1 bg-transparent"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm opacity-80 w-10">区分</label>
              <div className="inline-flex border rounded overflow-hidden">
                <button
                  type="button"
                  className={`px-3 py-1 text-sm ${section === "in" ? "bg-white/10" : "bg-transparent"}`}
                  onClick={() => setSection("in")}
                >
                  収入
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-sm ${section === "out" ? "bg-white/10" : "bg-transparent"}`}
                  onClick={() => setSection("out")}
                >
                  支出
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm opacity-80 w-10">金額</label>
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 bg-transparent text-right w-[140px]"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                />
                <span className="text-sm opacity-70">円</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm opacity-80 w-16">カテゴリ</label>
              <select
                className="border rounded px-2 py-1 bg-transparent min-w-[220px]"
                value={cashCategoryId ?? ""}
                onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
              >
                <option value="">選択してください</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} / id:{c.id}
                  </option>
                ))}
              </select>
              <span className="text-xs opacity-60">manualは必須</span>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[320px]">
              <label className="text-sm opacity-80 w-10">メモ</label>
              <input
                className="border rounded px-2 py-1 bg-transparent w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="任意"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="border rounded px-3 py-1">
              {submitting ? "登録中..." : "登録"}
            </button>

            <button type="button" className="border rounded px-3 py-1 opacity-80" onClick={() => void loadBase()} disabled={loading}>
              {loading ? "loading..." : "refresh"}
            </button>

            {message ? <span className="text-sm">{message}</span> : null}
            {selectedAccountName ? (
              <span className="text-xs opacity-60">
                selected: {selectedAccountName} / id:{cashAccountId}
              </span>
            ) : null}
          </div>
        </form>
      </div>

      <div className="border rounded p-4 bg-black/20">
        <div className="font-semibold mb-1">直近の取引</div>
        <div className="text-xs opacity-60 mb-3">最新30件（口座フィルタはここで効く）</div>

        <div className="overflow-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="opacity-70">
              <tr className="text-left border-b">
                <th className="py-2 w-[140px]">日付</th>
                <th className="py-2 w-[90px]">区分</th>
                <th className="py-2 w-[160px] text-right">金額</th>
                <th className="py-2 w-[260px]">カテゴリ</th>
                <th className="py-2">メモ</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2">{r.date}</td>
                  <td className="py-2">
                    <SectionBadge section={r.section} />
                  </td>
                  <td className="py-2 text-right font-semibold">{yen(r.amount)}</td>
                  <td className="py-2">{r.categoryName}</td>
                  <td className="py-2">{r.description ?? ""}</td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td className="py-3 opacity-60" colSpan={5}>
                    No rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}