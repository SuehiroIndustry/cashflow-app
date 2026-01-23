// app/transactions/transactions-client.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createCashFlow } from "./_actions/createCashFlow"; // ← transactions側のactionを推奨（無ければパスを合わせて）

type Option = { id: number; name: string };

type Row = {
  id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  cashAccountId: number;
  cashAccountName?: string | null;
  cashCategoryId?: number | null;
  cashCategoryName?: string | null;
  description?: string | null;
};

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;
  initialRows?: Row[]; // サーバー側で渡してるなら使う。無ければ空でOK
};

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function TransactionsClient({
  accounts,
  categories,
  initialCashAccountId,
  initialRows = [],
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  // --- form state
  const [cashAccountId, setCashAccountId] = useState<number | null>(initialCashAccountId);
  const [section, setSection] = useState<"in" | "out">("out");
  const [date, setDate] = useState<string>(todayYmd());
  const [amount, setAmount] = useState<string>("1000");
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(
    categories.length ? categories[0].id : null
  );
  const [description, setDescription] = useState<string>("");

  // --- list state
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [loadingRows, setLoadingRows] = useState(false);

  // --- ui state
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>("");

  const selectedAccountName = useMemo(() => {
    if (!cashAccountId) return null;
    return accounts.find((a) => a.id === cashAccountId)?.name ?? null;
  }, [accounts, cashAccountId]);

  /**
   * ✅ ここだけ、あなたの現状の「直近取引取得」のロジックに合わせて書き換えればOK。
   * 今は supabase から直接読む実装（テーブル名は例）。
   * もし server action で取ってるなら、それを呼ぶ形に置換して。
   */
  const refreshRows = useCallback(async () => {
    if (!cashAccountId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      // 例: cash_flows を直近20件（あなたのスキーマに合わせて変更）
      const { data, error } = await supabase
        .from("cash_flows")
        .select("id,date,section,amount,cash_account_id,cash_category_id,description")
        .eq("cash_account_id", cashAccountId)
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);

      if (error) throw error;

      const mapped: Row[] =
        (data ?? []).map((r: any) => ({
          id: r.id,
          date: r.date,
          section: r.section,
          amount: r.amount,
          cashAccountId: r.cash_account_id,
          cashAccountName: selectedAccountName,
          cashCategoryId: r.cash_category_id,
          cashCategoryName:
            categories.find((c) => c.id === r.cash_category_id)?.name ?? null,
          description: r.description,
        })) ?? [];

      setRows(mapped);
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message ?? "直近取引の取得に失敗しました");
    } finally {
      setLoadingRows(false);
    }
  }, [cashAccountId, supabase, categories, selectedAccountName]);

  useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!cashAccountId) {
      setMessage("口座が未選択です");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setMessage("金額が不正です");
      return;
    }

    if (!cashCategoryId) {
      setMessage("カテゴリが未選択です（manualは必須）");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
  cashAccountId,
  date,
  section,
  amount: amountNum,
  cashCategoryId,
  description: description.trim() ? description.trim() : null,
  sourceType: "manual" as const,
};

      await createCashFlow(payload);

      setMessage("登録しました");
      setDescription("");
      // 登録後、即反映
      await refreshRows();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.message ?? "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] text-neutral-100">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Transactions</h1>
          <div className="text-sm text-neutral-400">
            実務用：最短入力 → 即反映 → 直近が見える
          </div>
        </div>

        {/* --- Form Card --- */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* account */}
              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">口座</label>
                <select
                  value={cashAccountId ?? ""}
                  onChange={(e) => setCashAccountId(Number(e.target.value) || null)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                >
                  <option value="">選択してください</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} / id:{a.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* date */}
              <div className="md:col-span-3">
                <label className="block text-xs text-neutral-400 mb-1">日付</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>

              {/* section */}
              <div className="md:col-span-2">
                <label className="block text-xs text-neutral-400 mb-1">区分</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSection("in")}
                    className={[
                      "flex-1 rounded-md border px-3 py-2 text-sm",
                      section === "in"
                        ? "border-emerald-700 bg-emerald-900/40 text-emerald-200"
                        : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800/60",
                    ].join(" ")}
                  >
                    収入
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection("out")}
                    className={[
                      "flex-1 rounded-md border px-3 py-2 text-sm",
                      section === "out"
                        ? "border-red-700 bg-red-900/40 text-red-200"
                        : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:bg-neutral-800/60",
                    ].join(" ")}
                  >
                    支出
                  </button>
                </div>
              </div>

              {/* amount */}
              <div className="md:col-span-4">
                <label className="block text-xs text-neutral-400 mb-1">金額（円）</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-neutral-700"
                  placeholder="1000"
                />
              </div>

              {/* category */}
              <div className="md:col-span-4">
                <label className="block text-xs text-neutral-400 mb-1">
                  カテゴリ <span className="text-neutral-500">（manualは必須）</span>
                </label>
                <select
                  value={cashCategoryId ?? ""}
                  onChange={(e) => setCashCategoryId(Number(e.target.value) || null)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                >
                  <option value="">選択してください</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} / id:{c.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* memo */}
              <div className="md:col-span-8">
                <label className="block text-xs text-neutral-400 mb-1">メモ（任意）</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-700"
                  placeholder="例：Amazon広告 / 仕入れ / 交通費"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-white disabled:opacity-60"
              >
                {submitting ? "登録中..." : "登録"}
              </button>

              <button
                type="button"
                onClick={() => void refreshRows()}
                disabled={loadingRows}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800/60 disabled:opacity-60"
              >
                {loadingRows ? "更新中..." : "直近を更新"}
              </button>

              {message ? <div className="text-sm text-neutral-300">{message}</div> : null}
            </div>
          </form>
        </div>

        {/* --- List Card --- */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/40 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">直近取引</div>
              <div className="text-xs text-neutral-500">
                口座: {selectedAccountName ?? "未選択"} / 最新 {rows.length} 件
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-800">
                <tr className="text-left">
                  <th className="py-3 pr-3">日付</th>
                  <th className="py-3 pr-3">区分</th>
                  <th className="py-3 pr-3 text-right">金額</th>
                  <th className="py-3 pr-3">カテゴリ</th>
                  <th className="py-3 pr-3">メモ</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-neutral-900 hover:bg-neutral-900/60"
                  >
                    <td className="py-3 pr-3 text-neutral-300 whitespace-nowrap">
                      {r.date}
                    </td>

                    <td className="py-3 pr-3">
                      <span
                        className={[
                          "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
                          r.section === "in"
                            ? "border-emerald-700 bg-emerald-900/40 text-emerald-200"
                            : "border-red-700 bg-red-900/40 text-red-200",
                        ].join(" ")}
                      >
                        {r.section === "in" ? "収入" : "支出"}
                      </span>
                    </td>

                    <td className="py-3 pr-3 text-right font-mono text-base text-white whitespace-nowrap">
                      {yen(r.amount)}
                    </td>

                    <td className="py-3 pr-3 text-neutral-200 whitespace-nowrap">
                      {r.cashCategoryName ?? (r.cashCategoryId ? `id:${r.cashCategoryId}` : "—")}
                    </td>

                    <td className="py-3 pr-3 text-neutral-400">
                      {r.description ?? ""}
                    </td>
                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-neutral-500">
                      直近取引がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-neutral-500">
            ※ 行クリック編集は次のステップで入れる（まずは読めることが最優先）
          </div>
        </div>
      </div>
    </div>
  );
}