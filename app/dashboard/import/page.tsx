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
  const cashAccountId = toInt(searchParams?.cashAccountId) ?? 2; // ✅ 口座1個なのでデフォ2でOK
  return <ImportClient cashAccountId={cashAccountId} />;
}