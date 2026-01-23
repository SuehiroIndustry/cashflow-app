// app/transactions/new/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";

// ★ new/ 配下なので 1階層上の _actions を参照する
import { createCashFlow } from "../_actions/createCashFlow";

type Option = { id: number; name: string };

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;
};

export default function TransactionForm({
  accounts,
  categories,
  initialCashAccountId,
}: Props) {
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [cashAccountId, setCashAccountId] = useState<number | null>(
    initialCashAccountId ?? (accounts[0]?.id ?? null)
  );
  const [date, setDate] = useState<string>(today);
  const [section, setSection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<string>("");

  const [cashCategoryId, setCashCategoryId] = useState<number | null>(
    categories[0]?.id ?? null
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

    // manual はカテゴリ必須（あなたのDB制約）
    if (!cashCategoryId) {
      setMessage("カテゴリが未選択です（manual は必須）");
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

        // ★ 必須
        sourceType: "manual",
      });

      setAmount("");
      setDescription("");
      setMessage("登録しました");
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? <div className="text-sm text-white/80">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <div className="text-xs text-white/70">口座</div>
          <select
            className="w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
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
        </label>

        <label className="space-y-1">
          <div className="text-xs text-white/70">日付</div>
          <input
            type="date"
            className="w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <div className="text-xs text-white/70">区分</div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded px-3 py-2 text-sm border ${
                section === "in"
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/15 bg-transparent text-white/70"
              }`}
              onClick={() => setSection("in")}
            >
              収入
            </button>
            <button
              type="button"
              className={`rounded px-3 py-2 text-sm border ${
                section === "out"
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/15 bg-transparent text-white/70"
              }`}
              onClick={() => setSection("out")}
            >
              支出
            </button>
          </div>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1">
          <div className="text-xs text-white/70">金額</div>
          <input
            inputMode="numeric"
            className="w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white text-right"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例：1000"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-xs text-white/70">カテゴリ（manual必須）</div>
          <select
            className="w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
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
        </label>
      </div>

      <label className="space-y-1 block">
        <div className="text-xs text-white/70">メモ</div>
        <input
          className="w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="任意"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded border border-white/20 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-50"
      >
        {submitting ? "登録中..." : "登録"}
      </button>
    </form>
  );
}