// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";

import type { CashFlowCreateInput, Option, TransactionRow } from "./_types";
import { createCashFlow } from "./_actions/createCashFlow";
import { createClient } from "@/utils/supabase/client";

// もし「直近の取引」を server action で取っているなら、それを使う想定。
// 無い場合は一旦 props を空配列で渡しておけばOK。
// import { getRecentTransactions } from "./_actions/getRecentTransactions";

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;

  // page.tsx 側で取って渡せるなら渡す（推奨）
  initialRecent?: TransactionRow[];
};

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function TransactionsClient({
  accounts,
  categories,
  initialCashAccountId,
  initialRecent = [],
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [cashAccountId, setCashAccountId] = useState<number | null>(
    initialCashAccountId ?? (accounts[0]?.id ?? null)
  );

  const [section, setSection] = useState<"in" | "out">("in");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [amountText, setAmountText] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(
    categories[0]?.id ?? null
  );
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [recent, setRecent] = useState<TransactionRow[]>(initialRecent);

  async function reloadRecent() {
    // ここはあなたの実装に合わせて差し替え
    // 例：server action があるなら：
    // const rows = await getRecentTransactions({ cashAccountId, limit: 30 })
    // setRecent(rows)

    // いまは最低限：supabase のセッション更新でキャッシュ揺らし（任意）
    await supabase.auth.getSession();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!cashAccountId) {
      setMessage("口座が未選択です");
      return;
    }

    const amountNum = Number(amountText);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }

    if (!cashCategoryId) {
      setMessage("カテゴリが未選択です（manual は必須）");
      return;
    }

    const payload: CashFlowCreateInput = {
      cashAccountId,
      date,
      section,
      amount: amountNum,
      cashCategoryId,
      description: description.trim() ? description.trim() : null,
      sourceType: "manual",
    };

    try {
      setSubmitting(true);
      await createCashFlow(payload);

      setMessage("登録しました");

      // UX：入力の一部だけ残す
      setAmountText("1000");
      setDescription("");

      await reloadRecent();
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
        <h1 className="text-xl font-semibold">Transactions</h1>
        <p className="text-sm opacity-70 mt-1">
          実務用：最短入力 → 即反映 → 直近が見える
        </p>
      </div>

      {/* 入力カード */}
      <div className="border rounded-xl p-5 bg-black/20">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* 1行目：口座 + 日付 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm opacity-80">口座</label>
              <select
                className="border rounded px-3 py-2 bg-transparent w-full"
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

            <div className="flex items-center gap-3">
              <label className="w-16 text-sm opacity-80">日付</label>
              <input
                type="date"
                className="border rounded px-3 py-2 bg-transparent w-full"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* 2行目：区分 + 金額 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm opacity-80">区分</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSection("in")}
                  className={
                    section === "in"
                      ? "border rounded px-3 py-2 text-sm bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                      : "border rounded px-3 py-2 text-sm opacity-80"
                  }
                >
                  収入
                </button>
                <button
                  type="button"
                  onClick={() => setSection("out")}
                  className={
                    section === "out"
                      ? "border rounded px-3 py-2 text-sm bg-red-500/10 border-red-500/40 text-red-200"
                      : "border rounded px-3 py-2 text-sm opacity-80"
                  }
                >
                  支出
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="w-16 text-sm opacity-80">金額</label>
              <div className="flex items-center gap-2 w-full">
                <input
                  className="border rounded px-3 py-2 bg-transparent w-full text-right"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value)}
                  inputMode="numeric"
                  placeholder="1000"
                />
                <span className="text-sm opacity-70 w-10">円</span>
              </div>
            </div>
          </div>

          {/* 3行目：カテゴリ + メモ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm opacity-80">カテゴリ</label>
              <div className="flex items-center gap-2 w-full">
                <select
                  className="border rounded px-3 py-2 bg-transparent w-full"
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
                <span className="text-xs opacity-60 whitespace-nowrap">manual は必須</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="w-16 text-sm opacity-80">メモ</label>
              <input
                className="border rounded px-3 py-2 bg-transparent w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="任意"
              />
            </div>
          </div>

          {/* 送信 */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="border rounded px-4 py-2 text-sm"
            >
              {submitting ? "登録中..." : "登録"}
            </button>

            {message ? (
              <span className="text-sm opacity-90">{message}</span>
            ) : (
              <span className="text-sm opacity-50">
                登録すると直近一覧に反映（想定）
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 直近の取引 */}
      <div className="border rounded-xl p-5 bg-black/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold">直近の取引</div>
            <div className="text-xs opacity-60 mt-1">最新30件（口座フィルタは次で付ける）</div>
          </div>

          <button
            className="border rounded px-3 py-1 text-sm"
            onClick={() => void reloadRecent()}
          >
            refresh
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="opacity-70">
              <tr className="text-left border-b">
                <th className="py-2 w-[130px]">日付</th>
                <th className="py-2 w-[90px]">区分</th>

                {/* ✅ 要望：金額とカテゴリを分ける */}
                <th className="py-2 w-[150px] text-right">金額</th>
                <th className="py-2 w-[260px]">カテゴリ</th>

                <th className="py-2">メモ</th>
              </tr>
            </thead>

            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2">{r.date}</td>

                  <td className="py-2">
                    <span
                      className={
                        r.section === "in"
                          ? "text-xs border rounded px-2 py-0.5 border-emerald-500/50 text-emerald-200 bg-emerald-500/10"
                          : "text-xs border rounded px-2 py-0.5 border-red-500/50 text-red-200 bg-red-500/10"
                      }
                    >
                      {r.section === "in" ? "収入" : "支出"}
                    </span>
                  </td>

                  <td className="py-2 text-right font-medium">
                    {yen(r.amount)}
                  </td>

                  <td className="py-2">
                    {r.categoryName ?? <span className="opacity-50">（未設定）</span>}
                  </td>

                  <td className="py-2">
                    {r.description ?? <span className="opacity-50">-</span>}
                  </td>
                </tr>
              ))}

              {!recent.length && (
                <tr>
                  <td className="py-3 opacity-60" colSpan={5}>
                    直近データがありません（または page.tsx から渡していません）
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