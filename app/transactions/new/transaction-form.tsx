// app/transactions/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";

import { createCashFlow } from "./_actions/createCashFlow";

type Option = { id: number; name: string };

// ここは君の実装に合わせて型名が違うかもだけど、ページ側から渡してる想定
export type CashCategoryOption = { id: number; name: string };

type Props = {
  accounts: Option[];
  categories: CashCategoryOption[];
  initialCashAccountId: number;
  onCreated?: () => void;
};

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatJPY(n: number) {
  return n.toLocaleString("ja-JP");
}

export default function TransactionForm(props: Props) {
  const { accounts, categories, initialCashAccountId, onCreated } = props;

  const [cashAccountId, setCashAccountId] = useState<number>(initialCashAccountId);
  const [date, setDate] = useState<string>(todayISO());
  const [section, setSection] = useState<"in" | "out">("out");
  const [amountText, setAmountText] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const amountNum = useMemo(() => Number(amountText.replace(/,/g, "")), [amountText]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }
    if (!cashAccountId) {
      setMessage("口座が未選択です");
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
  amount,
  cashCategoryId,
  description: description ? description : null,
  sourceType: "manual", // ★必須
});

      setMessage("登録しました");
      // 入力の流れ的に、金額だけ残してサクッと次入力したいなら date/section 以外をリセットでもOK
      setAmountText("");
      setDescription("");

      onCreated?.();
    } catch (err: any) {
      setMessage(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm">
          <div className="opacity-70 mb-1">口座</div>
          <select
            className="border rounded px-2 py-1 bg-transparent w-full"
            value={cashAccountId}
            onChange={(e) => setCashAccountId(Number(e.target.value))}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="opacity-70 mb-1">日付</div>
          <input
            className="border rounded px-2 py-1 bg-transparent w-full"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <div className="text-sm">
          <div className="opacity-70 mb-1">区分</div>
          <div className="flex gap-2">
            <button
              type="button"
              className={`border rounded px-3 py-1 ${section === "in" ? "bg-white/10" : ""}`}
              onClick={() => setSection("in")}
            >
              収入
            </button>
            <button
              type="button"
              className={`border rounded px-3 py-1 ${section === "out" ? "bg-white/10" : ""}`}
              onClick={() => setSection("out")}
            >
              支出
            </button>
          </div>
        </div>

        <label className="text-sm">
          <div className="opacity-70 mb-1">金額</div>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 bg-transparent w-full text-right"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              inputMode="numeric"
              placeholder="1000"
            />
            <span className="opacity-70">円</span>
          </div>
          <div className="text-xs opacity-60 mt-1">表示: ¥{Number.isFinite(amountNum) ? formatJPY(amountNum) : "-"}</div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="text-sm md:col-span-1">
          <div className="opacity-70 mb-1">カテゴリ（manualは必須）</div>
          <select
            className="border rounded px-2 py-1 bg-transparent w-full"
            value={cashCategoryId}
            onChange={(e) => setCashCategoryId(Number(e.target.value))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} / id:{c.id}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm md:col-span-3">
          <div className="opacity-70 mb-1">メモ（任意）</div>
          <input
            className="border rounded px-2 py-1 bg-transparent w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：ヤマト運輸、広告費、仕入れ など"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button className="border rounded px-3 py-1" disabled={submitting}>
          {submitting ? "登録中..." : "登録"}
        </button>
        {message && <div className="text-sm opacity-80">{message}</div>}
      </div>
    </form>
  );
}