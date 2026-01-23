"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCashFlow } from "./_actions/createCashFlow";

type Option = { id: number; name: string };

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatComma(n: string): string {
  const raw = n.replace(/[^\d]/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("ja-JP");
}

function parseAmount(n: string): number {
  const raw = n.replace(/[^\d]/g, "");
  if (!raw) return NaN;
  return Number(raw);
}

export default function TransactionForm({ accounts, categories, initialCashAccountId }: Props) {
  const router = useRouter();

  const [cashAccountId, setCashAccountId] = useState<number | null>(initialCashAccountId);
  const [section, setSection] = useState<"in" | "out">("out");
  const [date, setDate] = useState<string>(todayYmd());

  const [amountText, setAmountText] = useState<string>("1,000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(categories.length ? categories[0].id : null);
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const amountNum = useMemo(() => parseAmount(amountText), [amountText]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!cashAccountId) return setMessage("口座が未選択です");
    if (!date) return setMessage("日付が未入力です");

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return setMessage("金額が不正です");
    }

    // manual の場合はカテゴリ必須（DB制約）
    if (!cashCategoryId) {
      return setMessage("カテゴリが未選択です（manualは必須）");
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
      });

      setMessage("登録しました");

      // 実務的：口座・日付・区分は維持、金額とメモだけクリア
      setAmountText("");
      setDescription("");

      router.refresh();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* 1行目：口座・日付 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80 w-16">口座</label>
          <select
            value={cashAccountId ?? ""}
            onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
            className="border border-neutral-700 bg-transparent rounded px-2 py-1"
          >
            <option value="">選択</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80 w-16">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-neutral-700 bg-transparent rounded px-2 py-1"
          />
        </div>
      </div>

      {/* 2行目：区分・金額 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80 w-16">区分</label>
          <div className="inline-flex rounded border border-neutral-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setSection("in")}
              className={`px-3 py-1 text-sm ${
                section === "in" ? "bg-neutral-200 text-neutral-900" : "hover:bg-neutral-800"
              }`}
            >
              収入
            </button>
            <button
              type="button"
              onClick={() => setSection("out")}
              className={`px-3 py-1 text-sm ${
                section === "out" ? "bg-neutral-200 text-neutral-900" : "hover:bg-neutral-800"
              }`}
            >
              支出
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80 w-16">金額</label>
          <input
            value={amountText}
            onChange={(e) => setAmountText(formatComma(e.target.value))}
            inputMode="numeric"
            placeholder="例: 10,000"
            className="border border-neutral-700 bg-transparent rounded px-2 py-1 w-40 text-right"
          />
          <span className="text-sm opacity-70">円</span>
        </div>
      </div>

      {/* 3行目：カテゴリ・メモ */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm opacity-80 w-16">カテゴリ</label>
          <select
            value={cashCategoryId ?? ""}
            onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
            className="border border-neutral-700 bg-transparent rounded px-2 py-1"
          >
            <option value="">選択</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} / id:{c.id}
              </option>
            ))}
          </select>
          <span className="text-xs opacity-60">manualは必須</span>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <label className="text-sm opacity-80 w-16">メモ</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-neutral-700 bg-transparent rounded px-2 py-1 w-full"
            placeholder="任意"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="rounded border border-neutral-700 px-4 py-1 hover:bg-neutral-800 disabled:opacity-60"
        >
          {submitting ? "登録中..." : "登録"}
        </button>
        {message ? <span className="text-sm opacity-80">{message}</span> : null}
      </div>
    </form>
  );
}