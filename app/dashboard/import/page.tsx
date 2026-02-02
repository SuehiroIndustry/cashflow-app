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
        <h1 className="text-xl font-semibold">明細インポート</h1>
        <p className="mt-2 text-sm text-zinc-300">
          楽天銀行CSVをアップロードして取り込みます。
        </p>

        <div className="mt-6">
          <ImportClient cashAccountId={cashAccountId} />
        </div>
      </div>
    </div>
  );
}