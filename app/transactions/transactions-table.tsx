// app/transactions/transactions-table.tsx
import React from "react";
import type { RecentCashFlowRow } from "./_actions/getRecentCashFlows";

function yen(n: number) {
  return "¥" + n.toLocaleString("ja-JP");
}

function ymd(s: string) {
  // "2026-01-23" みたいなのをそのまま表示（必要なら整形）
  return s;
}

export default function TransactionsTable(props: { rows: RecentCashFlowRow[] }) {
  const { rows } = props;

  return (
    <div className="border rounded p-4">
      <div className="font-semibold mb-3">Transactions</div>

      <div className="overflow-auto">
        <table className="min-w-[860px] w-full text-sm">
          <thead className="opacity-70">
            <tr className="text-left border-b">
              <th className="py-2">Date</th>
              <th className="py-2">In/Out</th>

              {/* ✅ ここ：金額とカテゴリを分離 */}
              <th className="py-2">Amount</th>
              <th className="py-2">Category</th>

              <th className="py-2">Memo</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, idx) => (
              <tr key={(r as any).id ?? `${r.date}-${idx}`} className="border-b last:border-b-0">
                <td className="py-2 whitespace-nowrap">{ymd(r.date)}</td>

                <td className="py-2 whitespace-nowrap">
                  <span
                    className={
                      r.section === "in"
                        ? "text-emerald-600 font-medium"
                        : "text-red-600 font-medium"
                    }
                  >
                    {r.section}
                  </span>
                </td>

                <td className="py-2 whitespace-nowrap">{yen(r.amount)}</td>

                {/* ✅ category 名が無い場合の保険 */}
                <td className="py-2 whitespace-nowrap">
                  {(r as any).category_name ??
                    (r as any).cash_category_name ??
                    (r as any).categoryName ??
                    "-"}
                </td>

                <td className="py-2">{(r as any).description ?? (r as any).memo ?? ""}</td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td className="py-2 opacity-60" colSpan={5}>
                  No rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}