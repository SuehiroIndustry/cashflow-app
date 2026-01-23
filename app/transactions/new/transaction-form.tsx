// app/transactions/new/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createCashFlow } from "@/app/transactions/_actions/createCashFlow";

import type { CashFlowCreateInput, Option, Section } from "../_types";

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;
  onCreated?: () => void; // 親がリスト更新したい時用（任意）
};

export default function TransactionForm({
  accounts,
  categories,
  initialCashAccountId,
  onCreated,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [cashAccountId, setCashAccountId] = useState<number | null>(
    initialCashAccountId ?? (accounts.length ? accounts[0].id : null)
  );

  const [section, setSection] = useState<Section>("in");

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

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

    // manual の場合はカテゴリ必須（DB制約）
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
      sourceType: "manual", // ← ここが TS 的にも DB 的にも安全
    };

    try {
      setSubmitting(true);

      await createCashFlow(payload);

      setMessage("登録しました");
      setAmount("1000");
      setDescription("");

      // クライアント側セッションを軽く叩く（任意）
      await supabase.auth.getSession();

      onCreated?.();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* 1行目 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">口座</label>
          <select
            value={cashAccountId ?? ""}
            onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
            className="w-full border rounded px-2 py-1 bg-white"
          >
            <option value="">選択してください</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded px-2 py-1 bg-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600">区分</label>
          <div className="flex rounded border overflow-hidden">
            <button
              type="button"
              onClick={() => setSection("in")}
              className={`flex-1 px-3 py-1 text-sm ${
                section === "in" ? "bg-gray-900 text-white" : "bg-white"
              }`}
            >
              収入
            </button>
            <button
              type="button"
              onClick={() => setSection("out")}
              className={`flex-1 px-3 py-1 text-sm border-l ${
                section === "out" ? "bg-gray-900 text-white" : "bg-white"
              }`}
            >
              支出
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-600">金額</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            className="w-full border rounded px-2 py-1 bg-white"
            placeholder="例: 12000"
          />
        </div>
      </div>

      {/* 2行目 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">カテゴリ（manual必須）</label>
          <select
            value={cashCategoryId ?? ""}
            onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
            className="w-full border rounded px-2 py-1 bg-white"
          >
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} / id:{c.id}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="text-xs text-gray-600">メモ（任意）</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-2 py-1 bg-white"
            placeholder="例: Amazon手数料 / 外注費 / 交通費 など"
          />
        </div>
      </div>

      {/* 送信 */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="border rounded px-4 py-2 text-sm bg-white hover:bg-gray-50 disabled:opacity-60"
        >
          {submitting ? "登録中..." : "登録"}
        </button>
        {message ? (
          <span className="text-sm text-gray-700">{message}</span>
        ) : (
          <span className="text-sm text-gray-400">入力→登録→下の一覧に反映</span>
        )}
      </div>
    </form>
  );
}