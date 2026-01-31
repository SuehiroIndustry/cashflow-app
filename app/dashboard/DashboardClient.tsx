// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  OverviewPayload,
  CashStatus,
  AlertCard,
} from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  overviewPayload: OverviewPayload | null;
  cashStatus: CashStatus;
  alertCards: AlertCard[];
};

function fmtYmdHms(iso: string): string {
  try {
    const d = new Date(iso);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
  } catch {
    return iso;
  }
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  overviewPayload,
  cashStatus,
  alertCards,
}: Props) {
  const router = useRouter();

  // UI操作用の選択状態（URL基準に同期）
  const [selected, setSelected] = useState<number>(
    selectedAccountId ?? (accounts[0]?.id ?? 0)
  );

  useEffect(() => {
    const next = selectedAccountId ?? (accounts[0]?.id ?? 0);
    setSelected(next);
  }, [selectedAccountId, accounts]);

  const updatedLabel = useMemo(
    () => fmtYmdHms(cashStatus.updatedAtISO),
    [cashStatus.updatedAtISO]
  );

  const onChangeAccount = (nextId: number) => {
    setSelected(nextId);
    // ✅ これで「現金→楽天銀行に変わらない」系を根絶
    router.push(`/dashboard?cashAccountId=${nextId}`);
  };

  const importHref =
    selected ? `/cash/import/rakuten?cashAccountId=${selected}` : "/cash/import/rakuten";
  const simulationHref =
    selected ? `/simulation?cashAccountId=${selected}` : "/simulation";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Cashflow Dashboard</div>
            <div className="text-xs text-white/60 mt-1">更新: {updatedLabel}</div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ Simulation */}
            <Link
              href={simulationHref}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Simulation
            </Link>

            {/* ✅ 楽天銀行・明細インポート */}
            <Link
              href={importHref}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              楽天銀行・明細インポート
            </Link>
          </div>
        </div>

        {/* Account selector */}
        <div className="mt-4 flex items-center gap-2">
          <div className="text-sm text-white/70">口座:</div>
          <select
            value={selected}
            onChange={(e) => onChangeAccount(Number(e.target.value))}
            className="bg-black text-white border border-white/15 rounded-md px-3 py-2 text-sm"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alerts */}
      <div className="px-6 pt-4">
        {alertCards.map((a, idx) => (
          <div
            key={`${a.severity}-${idx}`}
            className="rounded-lg border border-white/10 bg-white text-black p-4 mb-4"
          >
            <div className="font-semibold">{a.title}</div>
            <div className="text-sm mt-1">{a.description}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="px-6 pb-10">
        <div className="grid gap-4 md:grid-cols-3">
          {/* ✅ OverviewCard は payload */}
          <OverviewCard payload={overviewPayload} />

          {/* ✅ BalanceCard / EcoCharts は rows 必須 */}
          <BalanceCard rows={monthly} />
          <EcoCharts rows={monthly} />
        </div>
      </div>
    </div>
  );
}