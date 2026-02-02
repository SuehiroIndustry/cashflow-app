// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";

type Props = {
  searchParams?: {
    cashAccountId?: string | string[];
  };
};

function toInt(v: unknown): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function Page({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-200">
        <h1 className="text-lg font-semibold">楽天銀行・明細インポート</h1>
        <p className="mt-2 text-sm text-zinc-400">
          CSV/TSV をアップロードして、内容を確認してから取り込みます。
        </p>

        <div className="mt-4 text-sm">
          <div className="text-zinc-400">cashAccountId（server）</div>
          <div className="mt-1 font-mono text-zinc-100">
            {cashAccountId ?? "（未指定）"}
          </div>
        </div>
      </div>

      <ImportClient cashAccountId={cashAccountId} />
    </div>
  );
}