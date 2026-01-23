// app/transactions/transactions-table.tsx
"use client";

import React from "react";

export type RecentRow = {
  id: number;
  date: string; // "YYYY-MM-DD"
  section: "in" | "out";
  amount: number;
  categoryName: string;
  description: string | null;
};

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

export default function TransactionsTable({
  rows,
  onDelete,
}: {
  rows: RecentRow[];
  onDelete: (id: number) => Promise<void>;
}) {
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
      <div className="text-sm font-semibold text-white">直近の取引</div>
      <div className="text-xs text-white/50">最新30件</div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/60">
              <th className="py-2 pr-3">日付</th>
              <th className="py-2 pr-3">区分</th>
              <th className="py-2 pr-3">金額</th>
              <th className="py-2 pr-3">カテゴリ</th>
              <th className="py-2 pr-3">メモ</th>
              <th className="py-2 pr-3 text-right">操作</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/10 text-white/90">
                <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>

                <td className="py-2 pr-3 whitespace-nowrap">
                  <span
                    className={[
                      "inline-flex items-center rounded border px-2 py-0.5 text-xs",
                      r.section === "in"
                        ? "border-emerald-400/40 text-emerald-300"
                        : "border-rose-400/40 text-rose-300",
                    ].join(" ")}
                  >
                    {r.section === "in" ? "収入" : "支出"}
                  </span>
                </td>

                <td className="py-2 pr-3 whitespace-nowrap">{yen(r.amount)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.categoryName}</td>
                <td className="py-2 pr-3 whitespace-nowrap text-white/70">
                  {r.description ?? ""}
                </td>

                <td className="py-2 pr-3 whitespace-nowrap text-right">
                  <button
                    type="button"
                    className="rounded border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                    onClick={async () => {
                      const ok = window.confirm("この取引を削除します。よろしいですか？");
                      if (!ok) return;
                      await onDelete(r.id);
                    }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-white/50">
                  表示する取引がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}