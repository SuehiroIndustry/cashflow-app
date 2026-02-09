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

export default async function ImportPage({ searchParams }: Props) {
  const cashAccountId = toInt(searchParams?.cashAccountId) ?? null;

  return (
    <div className="w-full">
      <ImportClient cashAccountId={cashAccountId} />
    </div>
  );
}