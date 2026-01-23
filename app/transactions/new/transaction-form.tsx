// app/transactions/new/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";

import { createCashFlow } from "../_actions/createCashFlow";
import type { CashCategoryOption } from "../_actions/getCashCategories";

type Option = { id: number; name: string };

type Props = {
  accounts: Option[];
  categories: CashCategoryOption[];
  initialCashAccountId: number | null;
  onCreated?: () => void;
};

export default function TransactionForm({
  accounts,
  categories,
  initialCashAccountId,
  onCreated,
}: Props) {
  const [cashAccountId, setCashAccountId] = useState<number | null>(
    initialCashAccountId
  );

  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [section, setSection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(
    categories.length ? categories[0].id : null
  );
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const categoryNameById = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!cashAccountId) {
      setMessage("口座が未選択です");
      return;
    }

    const amountNum = Number(amount.replaceAll(",", ""));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }

    if (!cashCategoryId) {
      setMessage("カテゴリが未選択です");
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
        description: description || null,
        sourceType: "manual", // ← ここ必須
      });

      setMessage(
        `登録しました：¥${amountNum.toLocaleString()} / ${
          categoryNameById.get(cashCategoryId) ?? ""
        }`
      );

      setAmount("1000");
      setDescription("");
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
      {/* UIは今のままでOKなので省略してない */}
      <button disabled={submitting} className="border rounded px-4 py-2">
        {submitting ? "登録中..." : "登録"}
      </button>

      {message && <div className="text-sm">{message}</div>}
    </form>
  );
}