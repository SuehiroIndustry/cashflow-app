// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";

import { createCashFlow } from "../dashboard/_actions/createCashFlow";
import type { CashCategoryOption } from "./_actions/getCashCategories";
import type { RecentCashFlowRow } from "./_actions/getRecentCashFlows";

type Option = { id: number; name: string };

type Props = {
  initialAccounts: Option[];
  initialCategories: CashCategoryOption[];
  initialCashAccountId: number | null;
  initialRows: RecentCashFlowRow[];
};

function fmtYMD(s: string) {
  // "YYYY-MM-DD" -> "YYYY/MM/DD"
  return s?.replaceAll("-", "/") ?? "";
}

export default function TransactionsClient(props: Props) {
  const { initialAccounts, initialCategories, initialCashAccountId, initialRows } = props;

  const [accounts] = useState<Option[]>(initialAccounts);
  const [categories] = useState<CashCategoryOption[]>(initialCategories);

  const [cashAccountId, setCashAccountId] = useState<number | null>(initialCashAccountId);

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [section, setSection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(
    categories.length ? categories[0].id : null
  );
  const [description, setDescription] = useState<string>("");

  const [rows, setRows] = useState<RecentCashFlowRow[]>(initialRows);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const categoryNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categories) m.set(c.id, c.name);
    return m;
  }, [categories]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!cashAccountId) {
      setMessage("口座が未選択です");
      return;
    }

    const amountNum = Number(String(amount).replaceAll(",", ""));
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
        sourceType: "manual" as const,
      });

      // 即時反映（最近一覧の先頭に追加）
      const catName = categoryNameById.get(cashCategoryId) ?? null;

      setRows((prev) => [
        {
          id: Date.now(), // 仮ID（本気で厳密にするなら createCashFlow がID返すようにする）
          date,
          section,
          amount: amountNum,
          cash_category_id: cashCategoryId,
          cash_category_name: catName,
          description: description.trim() ? description.trim() : null,
        },
        ...prev,
      ]);

      setMessage("登録しました");
      setAmount("1000");
      setDescription("");
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Transactions</div>
        <div className="text-sm opacity-70">実務用：最短入力 → 即反映 → 直近が見える</div>
      </div>

      {/* 入力カード */}
      <div className="border rounded-xl p-4 bg-black/30">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* 口座 */}
            <div className="md:col-span-3">
              <div className="text-xs opacity-70 mb-1">口座</div>
              <select
                className="w-full border rounded px-2 py-2 bg-transparent"
                value={cashAccountId ?? ""}
                onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
              >
                <option value="">選択してください</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} / id:{a.id}
                  </option>
                ))}
              </select>
            </div>

            {/* 日付 */}
            <div className="md:col-span-3">
              <div className="text-xs opacity-70 mb-1">日付</div>
              <input
                type="date"
                className="w-full border rounded px-2 py-2 bg-transparent"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* 区分 */}
            <div className="md:col-span-2">
              <div className="text-xs opacity-70 mb-1">区分</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSection("in")}
                  className={`border rounded px-3 py-2 text-sm ${
                    section === "in" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200" : "opacity-80"
                  }`}
                >
                  収入
                </button>
                <button
                  type="button"
                  onClick={() => setSection("out")}
                  className={`border rounded px-3 py-2 text-sm ${
                    section === "out" ? "bg-red-500/10 border-red-500/50 text-red-200" : "opacity-80"
                  }`}
                >
                  支出
                </button>
              </div>
            </div>

            {/* 金額 */}
            <div className="md:col-span-2">
              <div className="text-xs opacity-70 mb-1">金額</div>
              <div className="flex items-center gap-2">
                <input
                  className="w-full border rounded px-2 py-2 bg-transparent text-right"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                />
                <div className="text-sm opacity-70">円</div>
              </div>
            </div>

            {/* 登録 */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full border rounded px-3 py-2"
              >
                {submitting ? "登録中..." : "登録"}
              </button>
            </div>
          </div>

          {/* カテゴリ + メモ */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <div className="text-xs opacity-70 mb-1">カテゴリ（manualは必須）</div>
              <select
                className="w-full border rounded px-2 py-2 bg-transparent"
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
            </div>

            <div className="md:col-span-8">
              <div className="text-xs opacity-70 mb-1">メモ（任意）</div>
              <input
                className="w-full border rounded px-2 py-2 bg-transparent"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="任意"
              />
            </div>
          </div>

          {message ? <div className="text-sm opacity-90">{message}</div> : null}
        </form>
      </div>

      {/* 直近一覧 */}
      <div className="border rounded-xl p-4 bg-black/30">
        <div className="font-semibold mb-1">直近の取引</div>
        <div className="text-xs opacity-60 mb-3">最新30件（口座フィルタは後で付ける）</div>

        <div className="overflow-auto">
          <table className="min-w-[860px] w-full text-sm">
            <thead className="opacity-70">
              <tr className="text-left border-b">
                <th className="py-2 w-[140px]">日付</th>
                <th className="py-2 w-[90px]">区分</th>
                {/* ✅ ここが分離ポイント */}
                <th className="py-2 w-[160px] text-right">金額</th>
                <th className="py-2 w-[280px]">カテゴリ</th>
                <th className="py-2">メモ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isIn = r.section === "in";
                const badgeCls = isIn
                  ? "border-emerald-500/60 text-emerald-200"
                  : "border-red-500/60 text-red-200";

                return (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="py-2">{fmtYMD(r.date)}</td>
                    <td className="py-2">
                      <span className={`text-xs border rounded px-2 py-0.5 ${badgeCls}`}>
                        {isIn ? "収入" : "支出"}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">
                      ¥{Number(r.amount).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {r.cash_category_name ??
                        (r.cash_category_id ? categoryNameById.get(r.cash_category_id) : null) ??
                        "-"}
                    </td>
                    <td className="py-2">{r.description ?? ""}</td>
                  </tr>
                );
              })}

              {!rows.length && (
                <tr>
                  <td className="py-2 opacity-60" colSpan={5}>
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