// app/transactions/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";

import { createCashFlow } from "./_actions/createCashFlow";
import type { CashCategoryOption } from "./_actions/getCashCategories";
import type { RecentRow } from "./transactions-client";

type Option = { id: number; name: string };

type Props = {
  accounts: Option[];
  categories: CashCategoryOption[];
  initialCashAccountId: number;
  disabled?: boolean;
  onCreated: (row: RecentRow) => void;
};

export default function TransactionForm({
  accounts,
  categories,
  initialCashAccountId,
  disabled = false,
  onCreated,
}: Props) {
  const [cashAccountId, setCashAccountId] = useState<number>(initialCashAccountId);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [section, setSection] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<number>(0);
  const [cashCategoryId, setCashCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoryName = useMemo(() => {
    const found = categories.find((c) => c.id === cashCategoryId);
    return found?.name ?? "";
  }, [categories, cashCategoryId]);

  const canSubmit =
    !disabled &&
    cashAccountId !== 0 &&
    !!date &&
    amount > 0 &&
    cashCategoryId !== 0 &&
    !submitting;

  return (
    <div className="rounded-lg border border-neutral-700 bg-neutral-950/40 p-4">
      <div className="text-lg font-semibold">Transactions</div>
      <div className="text-sm text-neutral-400">実務用：最短入力 → 即反映 → 直近が見える</div>

      {disabled && (
        <div className="mt-3 rounded border border-amber-700 bg-amber-950/30 p-3 text-amber-200">
          口座が未登録です。先に口座を作ってください（いまは入力を無効化しています）。
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 rounded border border-red-700 bg-red-950/30 p-3 text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <label className="text-xs text-neutral-400">口座</label>
          <select
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
            value={cashAccountId}
            onChange={(e) => setCashAccountId(Number(e.target.value))}
            disabled={disabled}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} / id:{a.id}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="text-xs text-neutral-400">日付</label>
          <input
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">区分</label>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className={`w-full rounded border px-3 py-2 ${
                section === "in"
                  ? "border-emerald-600 bg-emerald-950/40 text-emerald-200"
                  : "border-neutral-700 bg-neutral-950 text-neutral-200"
              }`}
              onClick={() => setSection("in")}
              disabled={disabled}
            >
              収入
            </button>
            <button
              type="button"
              className={`w-full rounded border px-3 py-2 ${
                section === "out"
                  ? "border-rose-600 bg-rose-950/40 text-rose-200"
                  : "border-neutral-700 bg-neutral-950 text-neutral-200"
              }`}
              onClick={() => setSection("out")}
              disabled={disabled}
            >
              支出
            </button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">金額</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-right"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={disabled}
            />
            <span className="text-sm text-neutral-300">円</span>
          </div>
        </div>

        <div className="md:col-span-2 flex items-end">
          <button
            className="w-full rounded border border-neutral-600 bg-neutral-900 px-4 py-2 hover:bg-neutral-800 disabled:opacity-40"
            disabled={!canSubmit}
            onClick={async () => {
              setErrorMsg(null);
              setSubmitting(true);
              try {
                const res = await createCashFlow({
                  cashAccountId,
                  date,
                  section,
                  amount,
                  cashCategoryId,
                  description: description.trim() ? description.trim() : null,
                  sourceType: "manual", // ✅ 必須
                });

                const newId = (res as any)?.id as number | undefined;

                const newRow: RecentRow = {
                  id: newId ?? Date.now(),
                  date,
                  section,
                  amount,
                  categoryName, // ✅ Tableが要求するキー
                  description: description.trim() ? description.trim() : null,
                };

                onCreated(newRow);

                setAmount(0);
                setDescription("");
              } catch (e: any) {
                setErrorMsg(e?.message ?? "登録に失敗しました");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            登録
          </button>
        </div>

        <div className="md:col-span-6">
          <label className="text-xs text-neutral-400">カテゴリ（manualは必須）</label>
          <select
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
            value={cashCategoryId}
            onChange={(e) => setCashCategoryId(Number(e.target.value))}
            disabled={disabled}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} / id:{c.id}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="text-xs text-neutral-400">メモ（任意）</label>
          <input
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
            placeholder="任意"
          />
        </div>
      </div>
    </div>
  );
}