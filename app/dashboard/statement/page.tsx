// app/dashboard/statement/page.tsx
export const dynamic = "force-dynamic";

import { getCashFlows } from "./_actions/getCashFlows";

type Props = {
  searchParams?: {
    cashAccountId?: string;
  };
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function yen(n: number): string {
  return new Intl.NumberFormat("ja-JP").format(n);
}

function sectionLabel(v: string | null | undefined): "収入" | "支出" {
  const s = String(v ?? "").toLowerCase();
  if (s === "income" || v === "収入") return "収入";
  return "支出";
}

export default async function StatementPage({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId) ?? 2; // デフォルトは内部的に維持（表示しない）
  const rows = await getCashFlows({
    cashAccountId,
    sourceType: "import",
    limit: 200,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">楽天銀行 明細ビュー</h1>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-900/40">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-700 text-left text-zinc-200">
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">区分</th>
                <th className="px-4 py-3 text-right">金額</th>
                <th className="px-4 py-3">摘要</th>
                <th className="px-4 py-3">登録</th>
              </tr>
            </thead>

            <tbody className="text-zinc-100">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-300" colSpan={5}>
                    データがありません
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const label = sectionLabel(r.section);
                  const isIncome = label === "収入";

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-zinc-800 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-mono text-zinc-200">
                        {r.date}
                      </td>
                      <td className="px-4 py-3">{label}</td>
                      <td
                        className={`px-4 py-3 text-right font-mono ${
                          isIncome ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {isIncome ? "" : "-"}¥{yen(Math.abs(r.amount))}
                      </td>
                      <td className="px-4 py-3 text-zinc-100">
                        {r.description ?? ""}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        {r.created_at?.slice(0, 19).replace("T", " ") ?? ""}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}