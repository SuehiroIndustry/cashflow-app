// app/transactions/transactions-table.tsx
import React from "react";
import type { RecentCashFlowRow } from "./_actions/getRecentCashFlows";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

type Props = {
  rows: RecentCashFlowRow[];
  title?: string;
};

export default function TransactionsTable({ rows, title = "直近の取引" }: Props) {
  return (
    <div className="border border-white/20 rounded-lg p-4 bg-black/10">
      <div className="font-semibold">{title}</div>
      <div className="text-xs opacity-70 mt-1">最新30件</div>

      <div className="mt-3 overflow-auto">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="opacity-80">
            <tr className="text-left border-b border-white/15">
              <th className="py-2 pr-3 w-[140px]">日付</th>
              <th className="py-2 pr-3 w-[90px]">区分</th>

              {/* ✅ 分割：金額 / カテゴリ */}
              <th className="py-2 pr-3 w-[140px]">金額</th>
              <th className="py-2 pr-3">カテゴリ</th>

              <th className="py-2 pr-3 w-[220px]">メモ</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => {
              // ここは「実データのキー名ブレ」を吸収（落ちないように）
              const category =
                (r as any).category_name ??
                (r as any).cash_category_name ??
                (r as any).cashCategoryName ??
                (r as any).categoryName ??
                "";

              const memo = (r as any).description ?? (r as any).memo ?? "";

              return (
                <tr key={(r as any).id ?? `${r.date}-${idx}`} className="border-b border-white/10 last:border-b-0">
                  <td className="py-2 pr-3 whitespace-nowrap">{r.date}</td>

                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span
                      className={
                        r.section === "in"
                          ? "inline-flex items-center px-2 py-0.5 rounded border border-emerald-400/40 text-emerald-300"
                          : "inline-flex items-center px-2 py-0.5 rounded border border-red-400/40 text-red-300"
                      }
                    >
                      {r.section === "in" ? "収入" : "支出"}
                    </span>
                  </td>

                  {/* ✅ 金額は金額だけ */}
                  <td className="py-2 pr-3 whitespace-nowrap font-medium">{yen(r.amount)}</td>

                  {/* ✅ カテゴリはカテゴリだけ */}
                  <td className="py-2 pr-3 whitespace-nowrap">{category || "-"}</td>

                  <td className="py-2 pr-3 whitespace-nowrap">{memo}</td>
                </tr>
              );
            })}

            {!rows.length && (
              <tr>
                <td className="py-3 opacity-60" colSpan={5}>
                  取引がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}