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
  cashStatus: CashStatus;
  alertCards: AlertCard[];
};

function fmtUpdated(iso: string) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${y}/${m}/${day} ${hh}:${mm}:${ss}`;
  } catch {
    return "-";
  }
}

export default function DashboardClient(props: Props) {
  const router = useRouter();

  // ✅ ここが肝：props.selectedAccountId を初期値にする（勝手に先頭へ戻さない）
  const [selectedId, setSelectedId] = useState<number | null>(
    props.selectedAccountId
  );

  // ✅ Server側で選択口座が変わったら state も追従
  useEffect(() => {
    setSelectedId(props.selectedAccountId);
  }, [props.selectedAccountId]);

  const selectedAccount = useMemo(() => {
    if (!selectedId) return null;
    return props.accounts.find((a) => a.id === selectedId) ?? null;
  }, [props.accounts, selectedId]);

  const overviewPayload: OverviewPayload | null = useMemo(() => {
    const latest = props.monthly.length
      ? props.monthly[props.monthly.length - 1]
      : null;

    return {
      cashAccountId: selectedId ?? undefined,
      accountName: selectedAccount?.name ?? "-",
      currentBalance: selectedAccount?.current_balance ?? 0,
      thisMonthIncome: latest?.income ?? 0,
      thisMonthExpense: latest?.expense ?? 0,
      net: (latest?.income ?? 0) - (latest?.expense ?? 0),
    };
  }, [props.monthly, selectedAccount, selectedId]);

  // ✅ 口座変更：URLを更新 → Server Component がその口座で再計算
  const onChangeAccount = (id: number) => {
    setSelectedId(id);

    const url = `/dashboard?cashAccountId=${id}`;
    router.push(url);
    // Next.js の挙動次第で再取得が遅れる環境があるので保険で refresh
    router.refresh();
  };

  const topButtonsHref = useMemo(() => {
    const id = selectedId ?? props.selectedAccountId ?? props.accounts[0]?.id ?? 1;
    return {
      simulation: `/simulation?cashAccountId=${id}`,
      rakutenImport: `/cash/import/rakuten`,
    };
  }, [selectedId, props.selectedAccountId, props.accounts]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold">Cashflow Dashboard</div>
            <div className="text-xs text-white/60 mt-1">
              更新: {fmtUpdated(props.cashStatus.updatedAtISO)}
            </div>
          </div>

          {/* ✅ 右上ボタン（指示通り：楽天銀行へは削除） */}
          <div className="flex items-center gap-2">
            <Link
              href={topButtonsHref.simulation}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10"
            >
              Simulation
            </Link>

            <Link
              href={topButtonsHref.rakutenImport}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white hover:bg-white/10"
            >
              楽天銀行・明細インポート
            </Link>
          </div>
        </div>

        {/* Account selector */}
        <div className="mt-4 flex items-center gap-3">
          <div className="text-sm text-white/70">口座:</div>
          <select
            className="bg-black text-white border border-white/20 rounded-md px-3 py-2 text-sm outline-none"
            value={selectedId ?? ""}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) onChangeAccount(v);
            }}
          >
            {props.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-4">
        {/* Alert */}
        {props.alertCards.map((a, idx) => (
          <div
            key={`${a.title}-${idx}`}
            className="rounded-lg border border-white/10 bg-white text-black p-4"
          >
            <div className="font-semibold">{a.title}</div>
            <div className="text-sm mt-1">{a.description}</div>
          </div>
        ))}

        {/* ✅ 「楽天銀行の明細CSV（説明ブロック）」は不要なので出さない */}

        {/* Main cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard payload={overviewPayload} />

          {/* BalanceCard は rows 必須の想定（エラー履歴から） */}
          <BalanceCard rows={props.monthly} />

          {/* EcoCharts も rows 必須（提示コード通り） */}
          <EcoCharts rows={props.monthly} />
        </div>
      </div>
    </div>
  );
}