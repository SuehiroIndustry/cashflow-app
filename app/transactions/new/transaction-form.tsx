// app/transactions/new/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createCashFlow } from "@/app/transactions/_actions/createCashFlow"; // ←おすすめ：transactions側に置く

type Option = { id: number; name: string };

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TransactionForm({ accounts, categories, initialCashAccountId }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [cashAccountId, setCashAccountId] = useState<number | null>(initialCashAccountId);
  const [section, setSection] = useState<"in" | "out">("out");
  const [date, setDate] = useState<string>(todayYmd());

  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(
    categories.length ? categories[0].id : null
  );
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

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

    try {
      setSubmitting(true);

      await createCashFlow({
        cashAccountId,
        date,
        section,
        amount: amountNum,
        cashCategoryId,
        description: description.trim() ? description.trim() : null,
        sourceType: "manual",
      } as any);

      setMessage("登録しました");
      setDescription("");

      // 任意：クライアントキャッシュを軽く揺らす
      await supabase.auth.getSession();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="text-neutral-100">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
        <h2 className="text-base font-semibold mb-1">取引登録</h2>
        <div className="text-xs text-neutral-500 mb-4">最短入力 → 即反映（manualはカテゴリ必須）</div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="block text-xs text-neutral-400 mb-1">口座</label>
              <select
                value={cashAccountId ?? ""}
                onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
              >
                <option value="">選択してください</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} / id:{a.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-1">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
              />
            </div>

            <div className="md:col-span-5">
              <label className="block text-xs text-neutral-400 mb-1">区分</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSection("in")}
                  className={[
                    "flex-1 rounded-md border px-3 py-2 text-sm",
                    section === "in"
                      ? "border-emerald-700 bg-emerald-900/40 text-emerald-200"
                      : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800/60",
                  ].join(" ")}
                >
                  収入
                </button>
                <button
                  type="button"
                  onClick={() => setSection("out")}
                  className={[
                    "flex-1 rounded-md border px-3 py-2 text-sm",
                    section === "out"
                      ? "border-red-700 bg-red-900/40 text-red-200"
                      : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800/60",
                  ].join(" ")}
                >
                  支出
                </button>
              </div>
            </div>

            <div className="md:col-span-4">
              <label className="block text-xs text-neutral-400 mb-1">金額（円）</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-neutral-700"
              />
            </div>

            <div className="md:col-span-8">
              <label className="block text-xs text-neutral-400 mb-1">
                カテゴリ <span className="text-neutral-500">（manual必須）</span>
              </label>
              <select
                value={cashCategoryId ?? ""}
                onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
              >
                <option value="">選択してください</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} / id:{c.id}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-12">
              <label className="block text-xs text-neutral-400 mb-1">メモ（任意）</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                placeholder="例：Amazon広告 / 仕入れ / 交通費"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-60"
            >
              {submitting ? "登録中..." : "登録"}
            </button>

            {message ? <span className="text-sm text-neutral-300">{message}</span> : null}
          </div>
        </form>
      </div>
    </div>
  );
}