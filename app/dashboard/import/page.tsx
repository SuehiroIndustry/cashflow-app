// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

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

export default async function Page({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <h1 className="text-lg font-semibold">楽天銀行・明細インポート</h1>
        <p className="mt-2 text-sm text-zinc-400">
          ここはインポート画面です（いまは仮実装）。
        </p>

        <div className="mt-4 text-sm">
          <div className="text-zinc-400">cashAccountId</div>
          <div className="mt-1 font-mono text-zinc-100">
            {cashAccountId ?? "（未指定）"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <div className="text-sm text-zinc-300">
          次にやること（ここはUIだけ置いておく）
        </div>

        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
          <li>楽天銀行メールの取り込み（Gmail → 解析 → cash_flows にINSERT）</li>
          <li>CSV/TSV 手動アップロード対応（バックアップ用）</li>
          <li>取引の重複検知（日時/金額/摘要のハッシュ等）</li>
        </ul>
      </div>
    </div>
  );
}