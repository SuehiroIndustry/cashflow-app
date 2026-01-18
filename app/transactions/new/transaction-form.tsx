// app/transactions/new/transaction-form.tsx
"use client";

import React, { useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function TransactionForm(props: {
  cashAccountId: number;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [date, setDate] = useState<string>("");
  const [type, setType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<string>("");
  const [cashCategoryId, setCashCategoryId] = useState<string>(""); // 入力は文字列でOK
  const [description, setDescription] = useState<string>("");

  const onSubmit = async () => {
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum)) {
      alert("金額が不正");
      return;
    }

    const cash_account_id = Number(props.cashAccountId);
    const cash_category_id = cashCategoryId ? Number(cashCategoryId) : null;

    const payload: any = {
      cash_account_id,
      date,
      type,
      amount: amountNum,
      description: description || null,
      currency: "JPY",
      source_type: "manual",
      section: type, // 既存のCHECK制約に合わせる（in/out）
      cash_category_id,
    };

    const { error } = await supabase.from("cash_flows").insert(payload);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    alert("登録しました");
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <label>
        日付&nbsp;
        <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="YYYY-MM-DD" />
      </label>

      <label>
        区分&nbsp;
        <select value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="in">in（収入）</option>
          <option value="out">out（支出）</option>
        </select>
      </label>

      <label>
        金額&nbsp;
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" />
      </label>

      <label>
        カテゴリID（manual必須）&nbsp;
        <input value={cashCategoryId} onChange={(e) => setCashCategoryId(e.target.value)} placeholder="1" />
      </label>

      <label>
        メモ（任意）&nbsp;
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="任意" />
      </label>

      <button onClick={onSubmit}>登録</button>
    </div>
  );
}