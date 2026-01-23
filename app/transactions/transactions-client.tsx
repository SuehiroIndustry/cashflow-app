// app/transactions/transactions-client.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import TransactionForm from "./new/transaction-form";
import type { Option, TransactionRow, Section } from "./_types";

function yen(n: number) {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

function sectionBadge(section: Section) {
  return section === "in"
    ? "inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
    : "inline-flex items-center rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs text-rose-700";
}

type Props = {
  accounts: Option[];
  categories: Option[];
  initialCashAccountId: number | null;

  /**
   * 直近N件を server component 側で取って渡す想定
   * （なければ [] でもOK）
   */
  initialRows: TransactionRow[];
};

export default function TransactionsClient(props: Props) {
  const { accounts, categories, initialCashAccountId, initialRows } = props;

  const router = useRouter();

  const [rows, setRows] = useState<TransactionRow[]>(initialRows ?? []);

  // 一覧フィルタ（実務用：口座と区分だけで十分効く）
  const [filterSection, setFilterSection] = useState<Section | "all">("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterSection !== "all" && r.section !== filterSection) return false;
      if (!qq) return true;

      const hay =
        `${r.date} ${r.section} ${r.amount} ${r.categoryName ?? ""} ${r.description ?? ""}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, filterSection, q]);

  const totals = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const r of filtered) {
      if (r.section === "in") inSum += r.amount;
      else outSum += r.amount;
    }
    return { inSum, outSum, net: inSum - outSum };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-semibold">Transactions</div>
        <div className="text-sm text-gray-600">
          実務用：最短入力 → 即反映 → 直近が見える
        </div>
      </div>

      {/* 入力カード */}
      <div className="border rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="font-semibold">新規入力</div>
          <button
            className="border rounded px-3 py-1 text-sm bg-white hover:bg-gray-50"
            onClick={() => router.refresh()}
          >
            refresh
          </button>
        </div>

        <TransactionForm
          accounts={accounts}
          categories={categories}
          initialCashAccountId={initialCashAccountId}
          onCreated={() => {
            // ここは「確実に最新一覧にする」なら refresh が一番強い
            router.refresh();
          }}
        />
      </div>

      {/* 一覧カード */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-semibold">直近の取引</div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-sm bg-white"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value as any)}
            >
              <option value="all">全て</option>
              <option value="in">収入のみ</option>
              <option value="out">支出のみ</option>
            </select>

            <input
              className="border rounded px-2 py-1 text-sm bg-white w-64"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="検索（メモ/カテゴリ/金額）"
            />
          </div>
        </div>

        {/* 集計（実務で便利） */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="border rounded p-3">
            <div className="text-gray-500">収入合計</div>
            <div className="font-semibold">{yen(totals.inSum)}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-gray-500">支出合計</div>
            <div className="font-semibold">{yen(totals.outSum)}</div>
          </div>
          <div className="border rounded p-3">
            <div className="text-gray-500">差引</div>
            <div className={`font-semibold ${totals.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {yen(totals.net)}
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr className="text-left">
                <th className="py-2">日付</th>
                <th className="py-2">区分</th>
                <th className="py-2">カテゴリ</th>
                <th className="py-2">メモ</th>
                <th className="py-2 text-right">金額</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2 whitespace-nowrap">{r.date}</td>
                  <td className="py-2 whitespace-nowrap">
                    <span className={sectionBadge(r.section)}>
                      {r.section === "in" ? "収入" : "支出"}
                    </span>
                  </td>
                  <td className="py-2 whitespace-nowrap">{r.categoryName ?? "-"}</td>
                  <td className="py-2">{r.description ?? ""}</td>
                  <td className="py-2 text-right whitespace-nowrap">{yen(r.amount)}</td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td className="py-6 text-center text-gray-500" colSpan={5}>
                    データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500">
          表示件数: {filtered.length}（フィルタ適用後）
        </div>
      </div>
    </div>
  );
}