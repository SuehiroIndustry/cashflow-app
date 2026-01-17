"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createCashFlow } from "@/app/dashboard/_actions/createCashFlow";

type Account = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  // ここはDB/取得側で無い可能性があるので optional にする
  type?: "income" | "expense";
};

type Props = {
  accounts: Account[];
  categories: Category[];
};

type TxType = "income" | "expense";

export default function TransactionForm({ accounts, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<TxType>("expense");
  const [cashAccountId, setCashAccountId] = useState<string>(accounts?.[0]?.id ?? "");
  const [cashCategoryId, setCashCategoryId] = useState<string>("");

  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const [amount, setAmount] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  const [error, setError] = useState<string>("");

  // categories に type が無い場合は絞り込みを無効化して全表示
  const canFilterByType = useMemo(() => {
    return (categories ?? []).some((c) => c.type === "income" || c.type === "expense");
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const list = categories ?? [];
    if (!canFilterByType) return list;
    return list.filter((c) => c.type === type);
  }, [categories, type, canFilterByType]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!cashAccountId) {
      setError("口座を選択してください。");
      return;
    }

    // 金額チェック
    const amountNum = Number(amount);
    if (!amount || Number.isNaN(amountNum) || amountNum <= 0) {
      setError("金額は正の数で入力してください。");
      return;
    }

    // manual 登録はカテゴリ必須（DBのCHECK制約）
    if (!cashCategoryId) {
      setError("カテゴリを選択してください。");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createCashFlow({
          type,
          // ★重要：bigint を number に変換しない（stringのまま渡す）
          cash_account_id: String(cashAccountId),
          cash_category_id: String(cashCategoryId),
          date,
          amount: amountNum,
          memo: memo ? memo : null,
          source_type: "manual",
        });

        // createCashFlow の戻りが boolean / object / void など色々あり得るので雑に安全処理
        if (res && typeof res === "object" && "error" in res && (res as any).error) {
          setError(String((res as any).error));
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
      {/* 種別 */}
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

        {!canFilterByType ? (
          <p className="text-xs text-gray-500">
            ※カテゴリに type 情報が無いので、収入/支出での絞り込みは無効になっています。
          </p>
        ) : null}
      </div>

      {/* 口座 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">口座</label>
        <select
          value={cashAccountId}
          onChange={(e) => setCashAccountId(e.target.value)}
          className="w-full rounded-md border px-3 py-2"
          required
        >
          {accounts?.length ? (
            accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))
          ) : (
            <option value="">口座がありません</option>
          )}
        </select>
      </div>

      {/* カテゴリ */}
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
        <p className="text-xs text-gray-500">※ manual 登録はカテゴリ必須（DB制約）です。</p>
      </div>

      {/* 日付 */}
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

      {/* 金額 */}
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

      {/* メモ */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">メモ（任意）</label>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例：コンビニ"
          className="w-full rounded-md border px-3 py-2"
        />
      </div>

      {/* エラー */}
      {error ? <div className="rounded-md border px-3 py-2 text-sm">{error}</div> : null}

      {/* 送信 */}
      <button
        type="submit"
        disabled={isPending || !accounts?.length}
        className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {isPending ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}