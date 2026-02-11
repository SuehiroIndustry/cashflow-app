// app/dashboard/income/IncomeClient.tsx
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualCashFlow } from "./_actions/createManualCashFlow";
import { deleteManualCashFlow } from "./_actions/deleteManualCashFlow";
import type { ManualCashFlowRow } from "./_actions/getRecentManualCashFlows";

type Props = {
  accounts: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  manualRows: ManualCashFlowRow[];
};

function clampNumberString(v: string) {
  return v.replace(/[^\d]/g, "");
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatJPY(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP").format(Math.round(n));
}

export default function IncomeClient({ accounts, categories, manualRows }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const defaultAccountId = accounts?.[0]?.id ?? null;

  const [date, setDate] = useState<string>(todayISO());
  const [section, setSection] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [cashAccountId, setCashAccountId] = useState<number | null>(defaultAccountId);
  const [cashCategoryId, setCashCategoryId] = useState<number | null>(categories?.[0]?.id ?? null);

  const amountNum = useMemo(() => Number(amount || 0), [amount]);

  const accountNameById = useMemo(() => {
    const m = new Map<number, string>();
    accounts.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [accounts]);

  const categoryNameById = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const pageBase = "min-h-screen bg-black text-white";
  const card = "rounded-xl border border-neutral-800 bg-neutral-950 shadow-sm";
  const cardHead = "px-5 pt-4 text-sm font-semibold text-white";
  const cardBody = "px-5 pb-5 pt-3 text-sm text-neutral-200";

  const label = "text-xs text-neutral-400";
  const inputBase =
    "h-10 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";
  const selectBase =
    "h-10 w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10";

  const buttonBase =
    "inline-flex h-10 items-center justify-center rounded-md border border-neutral-800 bg-neutral-950 px-4 text-sm text-white hover:bg-neutral-900 disabled:opacity-50 disabled:hover:bg-neutral-950";

  const canSubmit =
    !!cashAccountId &&
    !!cashCategoryId &&
    !!date &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  async function onSubmit() {
    if (!canSubmit) return;

    startTransition(async () => {
      try {
        await createManualCashFlow({
          date,
          section,
          amount: amountNum,
          description: description.trim() || null,
          cashAccountId: cashAccountId!,
          cashCategoryId: cashCategoryId!,
        });

        setAmount("");
        setDescription("");

        router.refresh();
        alert("登録しました");
      } catch (e: any) {
        alert(e?.message ?? "登録に失敗しました");
      }
    });
  }

  async function onDeleteRow(row: ManualCashFlowRow) {
    const ok = confirm(`削除しますか？\n${row.date} / ${row.section} / ${formatJPY(row.amount)} 円`);
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteManualCashFlow({
          cashFlowId: row.id,
          cashAccountId: row.cash_account_id,
          date: row.date,
        });

        router.refresh();
        alert("削除しました");
      } catch (e: any) {
        alert(e?.message ?? "削除に失敗しました");
      }
    });
  }

  return (
    <div className={pageBase}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">収支入力</h1>
          <div className="mt-1 text-sm text-neutral-400">
            手入力で登録するページです。カテゴリは必須です。
          </div>
        </div>

        {/* 入力 */}
        <div className={card}>
          <div className={cardHead}>入力</div>
          <div className={cardBody}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className={label}>日付</div>
                <input
                  className={inputBase}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <div className={label}>区分</div>
                <select
                  className={selectBase}
                  value={section}
                  onChange={(e) => setSection(e.target.value as any)}
                >
                  <option value="income">収入</option>
                  <option value="expense">支出</option>
                </select>
              </div>

              <div>
                <div className={label}>口座</div>
                <select
                  className={selectBase}
                  value={cashAccountId ?? ""}
                  onChange={(e) => setCashAccountId(Number(e.target.value))}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={label}>カテゴリ（必須）</div>
                <select
                  className={selectBase}
                  value={cashCategoryId ?? ""}
                  onChange={(e) => setCashCategoryId(Number(e.target.value))}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className={label}>金額（円）</div>
                <input
                  className={inputBase}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(clampNumberString(e.target.value))}
                  placeholder="例）120000"
                />
              </div>

              <div>
                <div className={label}>摘要（任意）</div>
                <input
                  className={inputBase}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例）家賃 / 仕入 / 売上"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button className={buttonBase} onClick={onSubmit} disabled={!canSubmit || isPending}>
                登録
              </button>
            </div>
          </div>
        </div>

        {/* 手入力一覧 */}
        <div className={`${card} mt-4`}>
          <div className={cardHead}>手入力（直近）</div>
          <div className="px-5 pb-5 pt-3">
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-950">
                  <tr className="text-left text-xs text-neutral-400">
                    <th className="px-3 py-2">日付</th>
                    <th className="px-3 py-2">区分</th>
                    <th className="px-3 py-2">口座</th>
                    <th className="px-3 py-2">カテゴリ</th>
                    <th className="px-3 py-2 text-right">金額</th>
                    <th className="px-3 py-2">摘要</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 bg-neutral-950">
                  {manualRows.map((r) => (
                    <tr key={r.id} className="text-neutral-200">
                      <td className="px-3 py-2">{r.date}</td>
                      <td className="px-3 py-2">{r.section === "income" ? "収入" : "支出"}</td>
                      <td className="px-3 py-2">{accountNameById.get(r.cash_account_id) ?? "-"}</td>
                      <td className="px-3 py-2">{categoryNameById.get(r.cash_category_id) ?? "-"}</td>
                      <td className="px-3 py-2 text-right">{formatJPY(r.amount)}</td>
                      <td className="px-3 py-2">{r.description ?? ""}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          className="text-xs text-neutral-300 hover:text-white disabled:opacity-50"
                          onClick={() => onDeleteRow(r)}
                          disabled={isPending}
                          title="削除"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {manualRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-neutral-500" colSpan={7}>
                        まだ手入力がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-neutral-500">
              ※削除できるのは「手入力（manual）」のみです（インポート明細は削除不可）
            </div>
          </div>
        </div>

        <div className="h-10" />
      </div>
    </div>
  );
}