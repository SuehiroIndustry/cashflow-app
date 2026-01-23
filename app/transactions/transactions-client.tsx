// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

import { createCashFlow } from "@/app/transactions/_actions/createCashFlow";

type Props = {
  // 既存に合わせて必要なら増やしてOK
};

export default function TransactionsClient(_props: Props) {
  const supabase = useMemo(() => createClient(), []);

  // ---- ここは既存の state/props に合わせて使ってOK（仮置き） ----
  const [cashAccountId, setCashAccountId] = useState<number | null>(null);
  const [section, setSection] = useState<"in" | "out">("in");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");
  // ------------------------------------------------------------

  async function onCreate() {
    setMessage("");

    if (cashAccountId == null) {
      setMessage("cashAccountId が未選択です");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }

    // manual の場合カテゴリ必須（DB制約）
    if (cashCategoryId == null) {
      setMessage("cashCategoryId が未選択です（manualは必須）");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ snake_case をやめて camelCase で統一
      await createCashFlow({
        cashAccountId,
        date,
        section,
        amount: amountNum,
        cashCategoryId,
        description: description.trim() ? description.trim() : null,
        sourceType: "manual",
      });

      setMessage("登録しました");
      await supabase.auth.getSession();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ここ以下は既存UIに合わせて置き換えてOK。大事なのは createCashFlow の payload */}
      <div className="border rounded p-4 space-y-3">
        <div className="font-semibold">Transactions</div>

        <div className="flex items-center gap-3">
          <label className="w-28 text-sm">cashAccountId</label>
          <input
            className="border px-2 py-1"
            value={cashAccountId ?? ""}
            onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
            placeholder="例: 1"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 text-sm">date</label>
          <input
            type="date"
            className="border px-2 py-1"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 text-sm">section</label>
          <select
            className="border px-2 py-1"
            value={section}
            onChange={(e) => setSection(e.target.value as "in" | "out")}
          >
            <option value="in">in</option>
            <option value="out">out</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 text-sm">amount</label>
          <input
            className="border px-2 py-1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 text-sm">cashCategoryId</label>
          <input
            className="border px-2 py-1"
            value={cashCategoryId ?? ""}
            onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
            placeholder="例: 10"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-28 text-sm">description</label>
          <input
            className="border px-2 py-1 w-96"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="border px-3 py-1" onClick={onCreate} disabled={submitting}>
            {submitting ? "登録中..." : "登録"}
          </button>
          {message ? <div className="text-sm">{message}</div> : null}
        </div>
      </div>
    </div>
  );
}