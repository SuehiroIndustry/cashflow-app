// app/simulation/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import SimulationClient from "./simulation-client";
import { getAccounts } from "@/app/dashboard/_actions/getAccounts";
import { getSimulation } from "./_actions/getSimulation";

type Props = {
  searchParams?: Promise<{ account?: string }>;
};

export default async function SimulationPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const accounts = await getAccounts();

  const accountParam = sp.account ? Number(sp.account) : NaN;
  const selectedAccountId =
    Number.isFinite(accountParam)
      ? accountParam
      : accounts.length > 0
      ? accounts[0].id
      : null;

  const sim =
    selectedAccountId != null
      ? await getSimulation({
          cashAccountId: selectedAccountId,
          months: 24,
          avgWindowMonths: 6,
          horizonMonths: 12,
        })
      : null;

  return (
    <SimulationClient
      accounts={accounts}
      selectedAccountId={selectedAccountId}
      simulation={sim}
    />
  );
}