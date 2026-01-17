"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createCashFlow } from "@/app/dashboard/_actions/cashflows"; // ←君の実パスに合わせて変更
// 重要：型は _types からのみ import する方針なら、ここも合わせてね
// import type { CashAccount, CashCategory } from "@/app/dashboard/_types";

type CashAccount = {
  id: string; // Supabase bigint を string 扱いに寄せる
  name: string;
};

type CashCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type Props = {
  cashAccounts: CashAccount[];
  cashCategories: CashCategory[];
};

type TxType = "income" | "expense";

export default function TransactionForm({ cashAccounts, cashCategories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<TxType>("expense");
  const [cashAccountId, setCashAccountId] = useState<string>(cashAccounts?.[0]?.id ?? "");
  const [cashCategoryId, setCashCategoryId] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    // YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  const [error, setError] = useState<string>("");

  const filteredCategories = useMemo(() => {
    return (cashCategories ?? []).filter((c) => c.type === type);
  }, [cashCategories, type]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // --- バリデーション（最低限） ---
    if (!cashAccountId) {
      setError("口座を選択してください。");
      return;
    }

    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("金額は正の数で入力してください。");
      return;
    }

    // manual の場合カテゴリ必須（君のDB CHECK制約に合わせる）
    // 今回はフォームが manual 前提なので必須にしてる
    if (!cashCategoryId) {
      setError("カテゴリを選択してください。");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createCashFlow({
          type,
          // ★ここが今回の修正の核：Number() をやめて string で渡す
          cash_account_id: cashAccountId,
          cash_category_id: cashCategoryId,
          date,
          amount: amountNum,
          memo: memo || null,
          source_type: "manual",
        });

        if (!res || (typeof res === "object" && "error" in res && res.error)) {
          const msg =
            typeof res === "object" && res && "error" in res && typeof (res as any).error === "string"
              ? (res as any).error
              : "登録に失敗しました。";
          setError(msg);
          return;
        }

        router.push("/transactions");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "登録に失敗しました。");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium">種別</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setType("expense");
              setCashCategoryId("");
            }}
            className={`rounded-md px-3 py-2 text-sm border ${
              type === "expense" ? "bg-black text-white" : "bg-white"
            }`}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => {
              setType("income");
              setCashCategoryId("");
            }}
            className={`rounded-md px-3 py-2 text-sm border ${
              type === "income" ? "bg-black text-white" : "bg-white"
            }`}
          >
            収入
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">口座</label>
        <select
          value={cashAccountId}
          onChange={(e) => setCashAccountId(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        >
          {cashAccounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">カテゴリ</label>
        <select
          value={cashCategoryId}
          onChange={(e) => setCashCategoryId(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        >
          <option value="">選択してください</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          ※ manual 登録はカテゴリ必須（DB制約）なので、未選択だと送信できません。
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">日付</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">金額</label>
        <input
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="例：1200"
          className="w-full rounded-md border px-3 py-2"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">メモ（任意）</label>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例：コンビニ"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      {error ? <div className="rounded-md border px-3 py-2 text-sm">{error}</div> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isPending ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}