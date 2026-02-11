// app/dashboard/statement/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
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

/**
 * 令和YYを 2000+YY として保存/表示してしまったバグ補正用。
 * 例: 2007 -> 2025（+18年）, 2008 -> 2026（+18年）
 *
 * "YYYY-MM-DD" / "YYYY-MM-01" 形式だけを補正する。
 */
function fixReiwaYearBug(isoDate: string): string {
  const m = String(isoDate ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(isoDate ?? "");

  const y = Number(m[1]);
  const mm = m[2];
  const dd = m[3];

  // 2000〜2018 を「令和年の誤変換」とみなして +18年補正
  if (Number.isFinite(y) && y >= 2000 && y <= 2018) {
    return `${y + 18}-${mm}-${dd}`;
  }
  return `${y}-${mm}-${dd}`;
}

export default async function StatementPage({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId) ?? 2; // ひとまず楽天銀行ID=2をデフォルト
  const rows = await getCashFlows({ cashAccountId, sourceType: "import", limit: 200 });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">楽天銀行 明細ビュー</h1>
          <p className="text-sm text-zinc-300">
            口座ID: <span className="font-mono text-zinc-200">{cashAccountId}</span> / source_type=import / 最新200件
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard?cashAccountId=${cashAccountId}`}
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Dashboardへ戻る
          </Link>
          <Link
            href={`/dashboard/import?cashAccountId=${cashAccountId}`}
            className="rounded-md bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
          >
            インポートへ
          </Link>
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
                    データがありません（または権限/RLSで取得できていません）
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isIncome = r.section === "収入" || r.section === "income";
                  const displayDate = fixReiwaYearBug(String(r.date ?? ""));
                  return (
                    <tr key={r.id} className="border-b border-zinc-800 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-zinc-200">{displayDate}</td>
                      <td className="px-4 py-3">{r.section}</td>
                      <td className={`px-4 py-3 text-right font-mono ${isIncome ? "text-emerald-300" : "text-rose-300"}`}>
                        {isIncome ? "" : "-"}¥{yen(Math.abs(r.amount))}
                      </td>
                      <td className="px-4 py-3 text-zinc-100">{r.description ?? ""}</td>
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

      <p className="mt-3 text-xs text-zinc-400">
        ※ 表示は「読むだけ」。インポート/残高/集計ロジックには一切触ってない。
      </p>
    </div>
  );
}