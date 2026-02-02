// app/dashboard/import/page.tsx
export const dynamic = "force-dynamic";

import ImportClient from "./ImportClient";
import { getAccounts } from "../_actions/getAccounts";

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
  const accounts = await getAccounts();

  const fromQuery = toInt(searchParams?.cashAccountId);
  const fallback = accounts?.[0]?.id ?? null;

  const cashAccountId = fromQuery ?? fallback;

  return (
    <ImportClient
      cashAccountId={cashAccountId}
      accounts={accounts}
    />
  );
}