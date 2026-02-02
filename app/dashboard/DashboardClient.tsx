// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import { getAccounts } from "./_actions/getAccounts";
import { getMonthlyBalance } from "./_actions/getMonthlyBalance";
import { getOverview } from "./_actions/getOverview";

import type {
  AccountRow,
  MonthlyBalanceRow,
  OverviewPayload,
  CashStatus,
  AlertCard,
} from "./_types";

type Props = {
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children?: React.ReactNode;

  // page.tsx 側から渡してるなら使う（無くても動くようにしてある）
  initialCashAccountId?: number | null;
};

function toInt(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function DashboardClient({
  cashStatus,
  alertCards,
  children,
  initialCashAccountId = null,
}: Props) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    initialCashAccountId
  );

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [monthly, setMonthly] = useState<MonthlyBalanceRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  // 口座一覧ロード
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingAccounts(true);
        const data = await getAccounts();
        if (!alive) return;

        setAccounts(data ?? []);

        // 初期選択：initialCashAccountId がなければ先頭を選ぶ
        if (selectedAccountId == null) {
          const firstId = data?.[0]?.id ?? null;
          setSelectedAccountId(firstId);
        }
      } finally {
        if (alive) setLoadingAccounts(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 選択口座のデータロード（Overview / Monthly）
  const loadAccountData = useCallback(async (cashAccountId: number | null) => {
    if (!cashAccountId) {
      setOverview(null);
      setMonthly([]);
      return;
    }

    setLoadingData(true);
    try {
      const [ov, mo] = await Promise.all([
        getOverview({ cashAccountId }),
        getMonthlyBalance({ cashAccountId, months: 12 }),
      ]);

      setOverview((ov ?? null) as OverviewPayload | null);
      setMonthly((mo ?? []) as MonthlyBalanceRow[]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadAccountData(selectedAccountId);
  }, [selectedAccountId, loadAccountData]);

  // ドロップダウン変更
  const onChangeAccount = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const id = toInt(v);
    setSelectedAccountId(id);
    // URLに反映させたいならこれ（page.tsx が searchParams 見てる構成向け）
    // router.push(`/dashboard?cashAccountId=${id ?? ""}`);
  };

  // ✅ ここが今回の本題：インポートページへの正しいリンク
  const goImport = () => {
    if (!selectedAccountId) return;
    router.push(`/dashboard/import?cashAccountId=${selectedAccountId}`);
  };

  const goSimulation = () => {
    router.push("/simulation");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-lg font-semibold">Cashflow Dashboard</div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
              onClick={goSimulation}
            >
              Simulation
            </button>

            <button
              type="button"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={goImport}
              disabled={!selectedAccountId}
              title={!selectedAccountId ? "口座を選択してください" : ""}
            >
              楽天銀行・明細インポート
            </button>

            <button
              type="button"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800"
              onClick={() => router.push("/logout")}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Account selector row */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="text-sm text-zinc-200">口座:</div>

          <select
            value={selectedAccountId ?? ""}
            onChange={onChangeAccount}
            className="min-w-[220px] rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white"
            disabled={loadingAccounts}
          >
            {loadingAccounts && <option value="">読み込み中...</option>}
            {!loadingAccounts && accounts.length === 0 && (
              <option value="">口座がありません</option>
            )}
            {!loadingAccounts &&
              accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>

          <div className="text-sm text-zinc-400">
            表示中:{" "}
            <span className="text-zinc-200">
              {selectedAccount?.name ?? "未選択"}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-10 pt-6">
        {/* ページ側から children を渡してる構成ならそれを優先 */}
        {children ? (
          children
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <OverviewCard
              cashStatus={cashStatus}
              overview={overview}
              loading={loadingData}
            />
            <BalanceCard monthly={monthly} loading={loadingData} />
            <EcoCharts monthly={monthly} loading={loadingData} />
          </div>
        )}

        {/* Alerts（使ってるなら） */}
        {alertCards?.length > 0 && (
          <div className="mt-6 space-y-2">
            {alertCards.map((a, idx) => (
              <div
                key={`${a.title}-${idx}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="text-sm font-semibold text-zinc-100">
                  {a.title}
                </div>
                {a.message && (
                  <div className="mt-1 text-sm text-zinc-300">{a.message}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}