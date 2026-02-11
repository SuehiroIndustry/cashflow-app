// app/dashboard/income/IncomeClient.tsx
"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualCashFlow } from "./_actions/createManualCashFlow";

type Props = {
  accounts: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
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

export default function IncomeClient({ accounts, categories }: Props) {
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

        // 入力を軽くリセット（口座/カテゴリは維持）
        setAmount("");
        setDescription("");

        // 画面の最新化（Dashboard/明細にも反映させたいので refresh）
        router.refresh();
        alert("登録しました");
      } catch (e: any) {
        alert(e?.message ?? "登録に失敗しました");
      }
    });
  }

  return (
    <div className={pageBase}>
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">収支入力</h1>
          <div className="mt-1 text-sm text-neutral-400">
            手入力（manual）として登録します。カテゴリは必須です。
          </div>
        </div>

        <div className={card}>
          <div className={cardHead}>入力</div>
          <div className={cardBody}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className={label}>日付</div>
                <input className={inputBase} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div>
                <div className={label}>区分</div>
                <select className={selectBase} value={section} onChange={(e) => setSection(e.target.value as any)}>
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

        <div className="h-10" />
      </div>
    </div>
  );
}