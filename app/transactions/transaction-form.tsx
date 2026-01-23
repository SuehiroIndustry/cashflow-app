// app/transactions/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createCashFlow } from "./_actions/createCashFlow";

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
  // ※無くても動くけど、あなたの現状構成に合わせて残しておく
  const supabase = useMemo(() => createClient(), []);

  const [cashAccountId, setCashAccountId] = useState<number | null>(
    initialCashAccountId
  );

  const [section, setSection] = useState<"in" | "out">("in");

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

    try {
      setSubmitting(true);

      await createCashFlow({
        cashAccountId,
        date,
        section,
        amount: amountNum,
        cashCategoryId,
        description: description.trim() ? description.trim() : null,

        // ✅ これが無いせいでビルド落ちてた
        sourceType: "manual",
      });

      setMessage("登録しました");

      // 任意：クライアント側の状態を軽く揺らす（不要なら消してOK）
      await supabase.auth.getSession();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="w-24 text-sm opacity-80">口座</label>
        <select
          value={cashAccountId ?? ""}
          onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
          className="border rounded px-2 py-1 bg-transparent"
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
        <label className="w-24 text-sm opacity-80">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border rounded px-2 py-1 bg-transparent"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="w-24 text-sm opacity-80">区分</label>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as "in" | "out")}
          className="border rounded px-2 py-1 bg-transparent"
        >
          <option value="in">in（収入）</option>
          <option value="out">out（支出）</option>
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="w-24 text-sm opacity-80">金額</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="numeric"
          className="border rounded px-2 py-1 bg-transparent"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="w-24 text-sm opacity-80">カテゴリ</label>
        <select
          value={cashCategoryId ?? ""}
          onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
          className="border rounded px-2 py-1 bg-transparent"
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

      <div className="flex items-center gap-3">
        <label className="w-24 text-sm opacity-80">メモ</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border rounded px-2 py-1 bg-transparent w-96"
          placeholder="任意"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="border rounded px-3 py-1"
        >
          {submitting ? "登録中..." : "登録"}
        </button>
        {message ? <span className="text-sm">{message}</span> : null}
      </div>
    </form>
  );
}