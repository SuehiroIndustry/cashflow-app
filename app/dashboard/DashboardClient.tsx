// app/dashboard/DashboardClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AccountRow, CashStatus, AlertCard } from "./_types";
import { getAccounts } from "./_actions/getAccounts";

type Props = {
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children: React.ReactNode;

  // page.tsx から渡すなら使う（なくても動く）
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
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // URL > 初期値 の順で選択口座を決める（/dashboard?cashAccountId=2 を優先）
  const urlCashAccountId = useMemo(() => {
    const v = searchParams?.get("cashAccountId");
    return v ? toInt(v) : null;
  }, [searchParams]);

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    urlCashAccountId ?? initialCashAccountId
  );

  useEffect(() => {
    // URLが変わったら追従（直リンク/戻る進む対応）
    if (urlCashAccountId !== null) setSelectedAccountId(urlCashAccountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCashAccountId]);

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

        // まだ未選択なら先頭を選ぶ
        if (selectedAccountId == null) {
          const firstId = data?.[0]?.id ?? null;
          setSelectedAccountId(firstId);

          // URLにも反映（必要なら）
          if (firstId != null) router.replace(`/dashboard?cashAccountId=${firstId}`);
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

  const onChangeAccount = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = toInt(e.target.value);
    setSelectedAccountId(id);
    router.push(`/dashboard?cashAccountId=${id ?? ""}`);
  };

  const goImport = () => {
    if (!selectedAccountId) return;
    // ✅ 正しい想定ルート：/dashboard/import
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
      <div className="px-6 pb-10 pt-6">{children}</div>

      {/* Alerts（使うなら） */}
      {alertCards?.length > 0 && (
        <div className="px-6 pb-10">
          <div className="space-y-2">
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
        </div>
      )}
    </div>
  );
}