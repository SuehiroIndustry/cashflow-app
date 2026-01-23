// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createCashFlow } from "./_actions/createCashFlow";
import { getRecentCashFlows } from "./_actions/getRecentCashFlows";
import type { CashCategoryOption } from "./_actions/getCashCategories";
import type { RecentCashFlowRow } from "./_actions/getRecentCashFlows";

type Option = { id: number; name: string };

type Props = {
  initialAccounts: Option[];
  initialCategories: CashCategoryOption[];
  initialCashAccountId: number;
  initialRows: RecentCashFlowRow[];
};

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function TransactionsClient({
  initialAccounts,
  initialCategories,
  initialCashAccountId,
  initialRows,
}: Props) {
  const [cashAccountId, setCashAccountId] = useState<number>(initialCashAccountId);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  });
  const [section, setSection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number>(
    initialCategories.length ? initialCategories[0].id : 1
  );
  const [description, setDescription] = useState<string>("");

  const [rows, setRows] = useState<RecentCashFlowRow[]>(initialRows);
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const accounts = useMemo(() => initialAccounts, [initialAccounts]);
  const categories = useMemo(() => initialCategories, [initialCategories]);

  async function refreshRows() {
    const r = await getRecentCashFlows({ cashAccountId, limit: 30 });
    setRows(r);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }
    if (!cashCategoryId) {
      setMessage("カテゴリが未選択です（manualは必須）");
      return;
    }

    try {
      setSubmitting(true);

      await createCashFlow({
        cashAccountId,
        date,
        section,
        amount: amountNum,
        cashCategoryId,
        description: description.trim() ? description.trim() : null,
        sourceType: "manual", // ✅ これが無いと型/制約で落ちる
      });

      await refreshRows();
      setMessage("登録しました");
    } catch (err: any) {
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 入力フォーム */}
      <form
        onSubmit={onSubmit}
        className="border border-white/20 rounded-lg p-4 bg-black/10"
      >
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-3">
            <label className="block text-xs opacity-70 mb-1">口座</label>
            <select
              className="w-full bg-black/20 border border-white/15 rounded px-3 py-2"
              value={cashAccountId}
              onChange={(e) => setCashAccountId(Number(e.target.value))}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} / id:{a.id}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-3">
            <label className="block text-xs opacity-70 mb-1">日付</label>
            <input
              className="w-full bg-black/20 border border-white/15 rounded px-3 py-2"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs opacity-70 mb-1">区分</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={
                  section === "in"
                    ? "px-3 py-2 rounded border border-emerald-400/40 text-emerald-300 bg-emerald-500/10"
                    : "px-3 py-2 rounded border border-white/15 opacity-70"
                }
                onClick={() => setSection("in")}
              >
                収入
              </button>
              <button
                type="button"
                className={
                  section === "out"
                    ? "px-3 py-2 rounded border border-red-400/40 text-red-300 bg-red-500/10"
                    : "px-3 py-2 rounded border border-white/15 opacity-70"
                }
                onClick={() => setSection("out")}
              >
                支出
              </button>
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-xs opacity-70 mb-1">金額</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full bg-black/20 border border-white/15 rounded px-3 py-2 text-right"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="opacity-70 text-sm">円</div>
            </div>
          </div>

          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 rounded border border-white/20 hover:border-white/40 disabled:opacity-50"
            >
              登録
            </button>
          </div>

          <div className="col-span-5">
            <label className="block text-xs opacity-70 mb-1">
              カテゴリ <span className="text-[11px] opacity-70">（manualは必須）</span>
            </label>
            <select
              className="w-full bg-black/20 border border-white/15 rounded px-3 py-2"
              value={cashCategoryId}
              onChange={(e) => setCashCategoryId(Number(e.target.value))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} / id:{c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-7">
            <label className="block text-xs opacity-70 mb-1">メモ（任意）</label>
            <input
              className="w-full bg-black/20 border border-white/15 rounded px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="任意"
            />
          </div>
        </div>

        {message && (
          <div className="mt-3 text-sm opacity-80">{message}</div>
        )}
      </form>

      {/* 直近の取引テーブル */}
      <div className="border border-white/20 rounded-lg p-4 bg-black/10">
        <div className="font-semibold">直近の取引</div>
        <div className="text-xs opacity-70 mt-1">最新30件</div>

        <div className="mt-3 overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="opacity-80">
              <tr className="text-left border-b border-white/15">
                <th className="py-2 pr-3 w-[140px]">日付</th>
                <th className="py-2 pr-3 w-[90px]">区分</th>

                {/* ✅ ここが肝：金額 と カテゴリ を分ける */}
                <th className="py-2 pr-3 w-[160px]">金額</th>
                <th className="py-2 pr-3">カテゴリ</th>

                <th className="py-2 pr-3 w-[220px]">メモ</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r: any, idx: number) => {
                // 既存データキーの揺れ吸収
                const category =
                  r.category_name ??
                  r.cash_category_name ??
                  r.categoryName ??
                  r.cashCategoryName ??
                  "";

                const memo = r.description ?? r.memo ?? "";

                return (
                  <tr
                    key={r.id ?? `${r.date}-${idx}`}
                    className="border-b border-white/10 last:border-b-0"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>

                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span
                        className={
                          r.section === "in"
                            ? "inline-flex items-center px-2 py-0.5 rounded border border-emerald-400/40 text-emerald-300"
                            : "inline-flex items-center px-2 py-0.5 rounded border border-red-400/40 text-red-300"
                        }
                      >
                        {r.section === "in" ? "収入" : "支出"}
                      </span>
                    </td>

                    {/* ✅ 金額だけ */}
                    <td className="py-2 pr-3 whitespace-nowrap font-medium">
                      {yen(Number(r.amount ?? 0))}
                    </td>

                    {/* ✅ カテゴリだけ */}
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {category || "-"}
                    </td>

                    <td className="py-2 pr-3 whitespace-nowrap">{memo}</td>
                  </tr>
                );
              })}

              {!rows.length && (
                <tr>
                  <td className="py-3 opacity-60" colSpan={5}>
                    取引がありません
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