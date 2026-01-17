"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCashFlow } from "../_actions/createCashFlow";

type Option = { id: number; name: string };

export default function TransactionForm(props: {
  accounts: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [cashAccountId, setCashAccountId] = useState<number | "">(
    props.accounts[0]?.id ?? ""
  );
  const [cashCategoryId, setCashCategoryId] = useState<number | "">(
    props.categories[0]?.id ?? ""
  );
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [section, setSection] = useState<string>("");

  const canSubmit =
    cashAccountId !== "" &&
    cashCategoryId !== "" &&
    date &&
    amount.trim() !== "" &&
    Number(amount) > 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <div className="text-sm text-white/70">Type</div>
          <select
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm text-white/70">Date</div>
          <input
            type="date"
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm text-white/70">Account</div>
          <select
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={cashAccountId}
            onChange={(e) => setCashAccountId(Number(e.target.value))}
          >
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm text-white/70">Category（manual必須）</div>
          <select
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={cashCategoryId}
            onChange={(e) => setCashCategoryId(Number(e.target.value))}
          >
            {props.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm text-white/70">Amount (JPY)</div>
          <input
            inputMode="numeric"
            placeholder="例: 12000"
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm text-white/70">Description</div>
          <input
            placeholder="例: ランチ、売上、交通費…"
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm text-white/70">Section（任意）</div>
          <input
            placeholder="例: personal / business"
            className="w-full rounded-lg bg-black border border-white/10 p-2"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={!canSubmit || isPending}
          className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 disabled:opacity-40"
          onClick={() => {
            if (!canSubmit) return;

            startTransition(async () => {
              const res = await createCashFlow({
                type,
                cash_account_id: Number(cashAccountId),
                cash_category_id: Number(cashCategoryId),
                date,
                amount: Number(amount),
                description: description || null,
                section: section || null,
              });

              if (!res.ok) {
                alert(res.message);
                return;
              }

              router.push("/dashboard");
              router.refresh();
            });
          }}
        >
          {isPending ? "Saving..." : "Save"}
        </button>

        <button
          className="rounded-lg border border-white/10 px-4 py-2"
          onClick={() => router.push("/dashboard")}
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-white/50">
        ※ amount は正の数で入力。type が expense の場合も DB 側は amount 正で入れてOK（集計側で符号を扱うなら）。
      </p>
    </div>
  );
}