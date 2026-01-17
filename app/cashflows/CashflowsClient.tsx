"use client";

import React, { useMemo, useState } from "react";
import type { AccountOption, CashFlowRow, CategoryOption } from "./_types";
import { createCashflow } from "./_actions/createCashflow";
import { getCashflows } from "./_actions/getCashflows";

function yen(n: number) {
  try {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${Math.trunc(n).toLocaleString("ja-JP")}円`;
  }
}

export default function CashflowsClient(props: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  initialAccountId: number;
  initialRows: CashFlowRow[];
}) {
  const { accounts, categories } = props;

  const [accountId, setAccountId] = useState<number>(props.initialAccountId);
  const [rows, setRows] = useState<CashFlowRow[]>(props.initialRows);
  const [loading, setLoading] = useState(false);

  // form state
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState<string>("");
  const [categoryId, setCategoryId] = useState<number>(
    categories[0]?.id ?? 1
  );
  const [description, setDescription] = useState<string>("");

  const accountName = useMemo(
    () => accounts.find((a) => a.id === accountId)?.name ?? "(unknown)",
    [accounts, accountId]
  );

  async function reload(nextAccountId: number) {
    setLoading(true);
    try {
      const data = await getCashflows({ cash_account_id: nextAccountId });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  async function onChangeAccount(next: number) {
    setAccountId(next);
    await reload(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amt = Number(amount);
    if (!date) return alert("日付が必要");
    if (!Number.isFinite(amt) || amt <= 0) return alert("金額が不正");
    if (!categoryId) return alert("カテゴリが必要（manualは必須）");

    setLoading(true);
    try {
      await createCashflow({
        cash_account_id: accountId,
        date,
        type,
        amount: amt,
        cash_category_id: categoryId,
        description: description.trim() ? description.trim() : undefined,
      });

      // 追加後に再取得（確実に整合取れる）
      await reload(accountId);

      // 入力リセット（気持ちよく次を入れられる）
      setAmount("");
      setDescription("");
      if (type === "income") setType("expense");
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? "追加に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Cashflows</h1>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Account</span>
            <select
              className="bg-black border border-white/20 rounded-md px-2 py-1 text-sm"
              value={accountId}
              onChange={(e) => onChangeAccount(Number(e.target.value))}
              disabled={loading}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.kind ? `(${a.kind})` : ""}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Add form */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold mb-3">
            Add transaction — <span className="text-white/60">{accountName}</span>
          </div>

          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">date</label>
              <input
                type="date"
                className="bg-black border border-white/20 rounded-md px-2 py-1 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">type</label>
              <select
                className="bg-black border border-white/20 rounded-md px-2 py-1 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={loading}
              >
                <option value="expense">expense</option>
                <option value="income">income</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">amount (JPY)</label>
              <input
                inputMode="numeric"
                className="bg-black border border-white/20 rounded-md px-2 py-1 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">category</label>
              <select
                className="bg-black border border-white/20 rounded-md px-2 py-1 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                disabled={loading}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/60">description</label>
              <input
                className="bg-black border border-white/20 rounded-md px-2 py-1 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="任意"
                disabled={loading}
              />
            </div>

            <div className="md:col-span-5 flex items-center justify-end gap-2">
              <button
                type="submit"
                className="rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Saving..." : "Add"}
              </button>
            </div>
          </form>
        </section>

        {/* List */}
        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Recent</div>
            <div className="text-xs text-white/60">
              rows: {rows.length} {loading ? "• loading..." : ""}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-2">date</th>
                  <th className="text-left py-2 pr-2">type</th>
                  <th className="text-right py-2 pr-2">amount</th>
                  <th className="text-left py-2 pr-2">category_id</th>
                  <th className="text-left py-2 pr-2">description</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/5">
                    <td className="py-2 pr-2">{r.date}</td>
                    <td className="py-2 pr-2">{r.type}</td>
                    <td className="py-2 pr-2 text-right">{yen(r.amount)}</td>
                    <td className="py-2 pr-2">{r.cash_category_id ?? "-"}</td>
                    <td className="py-2 pr-2 text-white/80">
                      {r.description ?? ""}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="py-6 text-white/60" colSpan={5}>
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}