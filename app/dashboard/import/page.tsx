// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";

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

export default function Page({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">楽天銀行 明細インポート</h1>
          <a
            href="/dashboard"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
          >
            ダッシュボードへ戻る
          </a>
        </div>

        <p className="mt-2 text-sm text-zinc-300">
          CSVは一切いじらず、そのままアップロードして取り込みます。
        </p>

        <div className="mt-6">
          <ImportClient cashAccountId={cashAccountId} />
        </div>
      </div>
    </div>
  );
}