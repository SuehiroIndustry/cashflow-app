// app/transactions/transactions-table.tsx
"use client";

import React from "react";

export type RecentRow = {
  id: number;
  date: string; // "YYYY-MM-DD" 想定
  section: "in" | "out";
  amount: number;
  categoryName: string;
  description: string | null;
};

type Props = {
  rows: RecentRow[];
  onDeleted: (deletedId: number) => void;
  onDeleteClick?: (id: number) => Promise<void> | void; // 親で削除API呼ぶなら使う（任意）
};

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function TransactionsTable({
  rows,
  onDeleted,
  onDeleteClick,
}: Props) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20">
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-white">直近の取引</div>
        <div className="text-xs text-white/60">最新{rows.length}件</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-t border-white/10 text-white/70">
            <tr>
              <th className="px-4 py-2 text-left font-medium">日付</th>
              <th className="px-4 py-2 text-left font-medium">区分</th>
              <th className="px-4 py-2 text-left font-medium">金額</th>
              <th className="px-4 py-2 text-left font-medium">カテゴリ</th>
              <th className="px-4 py-2 text-left font-medium">メモ</th>
              <th className="px-4 py-2 text-right font-medium">操作</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/10">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-white/60" colSpan={6}>
                  取引がありません
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="text-white/90">
                  <td className="px-4 py-3 whitespace-nowrap">{r.date}</td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={[
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
                        r.section === "in"
                          ? "border-emerald-400/30 text-emerald-300"
                          : "border-rose-400/30 text-rose-300",
                      ].join(" ")}
                    >
                      {r.section === "in" ? "収入" : "支出"}
                    </span>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">{yen(r.amount)}</td>

                  <td className="px-4 py-3 whitespace-nowrap">{r.categoryName}</td>

                  <td className="px-4 py-3">
                    <span className="text-white/70">
                      {r.description ?? ""}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                      onClick={async () => {
                        // 親で削除処理をするならここで await
                        if (onDeleteClick) await onDeleteClick(r.id);

                        // 表から消す（state更新）
                        onDeleted(r.id);
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}