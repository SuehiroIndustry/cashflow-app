// app/transactions/new/transaction-form.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCashFlow } from "@/app/dashboard/_actions/createCashFlow";

type OptionRow = { id: number | string; name: string };

type Props = {
  accounts: OptionRow[];
  categories: OptionRow[];
};

export default function TransactionForm({ accounts, categories }: Props) {
  const router = useRouter();

  const defaultAccountId = useMemo(() => {
    const first = accounts?.[0]?.id;
    return first != null ? String(first) : "";
  }, [accounts]);

  const defaultCategoryId = useMemo(() => {
    const first = categories?.[0]?.id;
    return first != null ? String(first) : "";
  }, [categories]);

  const [section, setSection] = useState<"in" | "out">("in");
  const [cashAccountId, setCashAccountId] = useState<string>(defaultAccountId);
  const [cashCategoryId, setCashCategoryId] = useState<string>(defaultCategoryId);

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("金額が不正です（1以上の数値）");
      return;
    }

    const accountNum = Number(cashAccountId);
    if (!Number.isFinite(accountNum) || accountNum <= 0) {
      setError("口座が不正です");
      return;
    }

    const categoryNum = Number(cashCategoryId);
    if (!Number.isFinite(categoryNum) || categoryNum <= 0) {
      setError("カテゴリが不正です");
      return;
    }

    try {
      setSubmitting(true);

      await createCashFlow({
        cash_account_id: accountNum, // ✅ numberで渡す
        date,
        section,
        amount: amountNum,
        cash_category_id: categoryNum, // ✅ numberで渡す
        description: description ? description : null,
      });

      // 登録後に戻す（好みで /dashboard へ）
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <div className="mb-1 text-sm text-white/70">区分</div>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as "in" | "out")}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            disabled={submitting}
          >
            <option value="in">収入（in）</option>
            <option value="out">支出（out）</option>
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">日付</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            disabled={submitting}
          />
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">口座</div>
          <select
            value={cashAccountId}
            onChange={(e) => setCashAccountId(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            disabled={submitting || (accounts?.length ?? 0) === 0}
          >
            {(accounts ?? []).map((a) => (
              <option key={String(a.id)} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">カテゴリ（manual必須）</div>
          <select
            value={cashCategoryId}
            onChange={(e) => setCashCategoryId(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            disabled={submitting || (categories?.length ?? 0) === 0}
          >
            {(categories ?? []).map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <div className="mb-1 text-sm text-white/70">金額</div>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例: 1000"
          className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
          disabled={submitting}
        />
      </label>

      <label className="block">
        <div className="mb-1 text-sm text-white/70">メモ（任意）</div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="例: ランチ、交通費など"
          className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
          disabled={submitting}
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
      >
        {submitting ? "送信中..." : "登録"}
      </button>
    </form>
  );
}