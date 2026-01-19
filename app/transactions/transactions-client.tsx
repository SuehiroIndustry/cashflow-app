// app/transactions/transactions-client.tsx
"use client";

import React, { useState } from "react";
import { createCashFlow } from "@/app/transactions/_actions/createCashFlow";
import type { CashFlowSection } from "@/app/dashboard/_types";

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TransactionsClient() {
  // フォームは string で持つ（input/selectがstringだから）
  const [cashAccountId, setCashAccountId] = useState<string>("");
  const [date, setDate] = useState<string>(todayYmd());
  const [section, setSection] = useState<CashFlowSection>("out");
  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  async function onCreate() {
    setMessage("");

    const cash_account_id = Number(cashAccountId);
    if (!Number.isFinite(cash_account_id) || cash_account_id <= 0) {
      setMessage("口座IDが不正です");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }

    // manualはカテゴリ必須
    const catNum = Number(cashCategoryId);
    if (!Number.isFinite(catNum) || catNum <= 0) {
      setMessage("カテゴリIDが不正です（manualは必須）");
      return;
    }

    try {
      setSubmitting(true);

      await createCashFlow({
        cash_account_id,
        date,
        section, // ✅ typeじゃなくsection
        amount: amountNum,
        cash_category_id: catNum,
        description: description.trim() ? description.trim() : null,
        source_type: "manual",
      });

      setMessage("登録しました");
      setDescription("");
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Transactions</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          口座ID{" "}
          <input
            inputMode="numeric"
            value={cashAccountId}
            onChange={(e) => setCashAccountId(e.target.value)}
            placeholder="例: 1"
            disabled={submitting}
          />
        </label>

        <label>
          日付{" "}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
        </label>

        <label>
          区分{" "}
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as CashFlowSection)}
            disabled={submitting}
          >
            <option value="in">in（収入）</option>
            <option value="out">out（支出）</option>
          </select>
        </label>

        <label>
          金額{" "}
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例: 1000"
            disabled={submitting}
          />
        </label>

        <label>
          カテゴリID（manual必須）{" "}
          <input
            inputMode="numeric"
            value={cashCategoryId}
            onChange={(e) => setCashCategoryId(e.target.value)}
            placeholder="例: 1"
            disabled={submitting}
          />
        </label>

        <label style={{ flex: "1 1 240px" }}>
          メモ{" "}
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="任意"
            disabled={submitting}
            style={{ width: "100%" }}
          />
        </label>

        <button onClick={onCreate} disabled={submitting}>
          {submitting ? "登録中..." : "登録"}
        </button>

        {message ? <span style={{ fontSize: 12 }}>{message}</span> : null}
      </div>
    </div>
  );
}