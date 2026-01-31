"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import OverviewCard from "./_components/OverviewCard";
import BalanceCard from "./_components/BalanceCard";
import EcoCharts from "./_components/EcoCharts";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
  OverviewPayload,
} from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children?: React.ReactNode;
};

function formatJPY(n: number | null | undefined) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("ja-JP").format(Math.round(n)) + " 円";
}

function severityStyle(sev: AlertCard["severity"]) {
  if (sev === "critical") {
    return "border-red-800 bg-red-950 text-red-100";
  }
  if (sev === "warning") {
    return "border-yellow-800 bg-yellow-950 text-yellow-100";
  }
  return "border-neutral-700 bg-neutral-900 text-neutral-100";
}

function statusHeadline(cs: CashStatus): string {
  // 最低限の判断メッセージ（型にある情報だけで組み立て）
  const bal = cs.currentBalance;
  const net = cs.monthNet;

  if (typeof bal === "number" && bal <= 300_000) return "残高が危険水域です";
  if (typeof net === "number" && net < 0) return "今月の収支がマイナスです";

  if (cs.selectedAccountName) return `${cs.selectedAccountName} の状況`;
  return "状況を確認中";
}

function statusBody(cs: CashStatus): string {
  const parts: string[] = [];

  if (cs.selectedAccountName) {
    parts.push(`口座：${cs.selectedAccountName}`);
  } else {
    parts.push("口座：—");
  }

  parts.push(`現在残高：${formatJPY(cs.currentBalance)}`);

  if (cs.monthLabel) {
    parts.push(
      `${cs.monthLabel}：収入 ${formatJPY(cs.monthIncome)} / 支出 ${formatJPY(
        cs.monthExpense
      )} / 差額 ${formatJPY(cs.monthNet)}`
    );
  } else {
    parts.push("月次：—");
  }

  return parts.join("　|　");
}

export default function DashboardClient({
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
  children,
}: Props) {
  const router = useRouter();

  const selectedAccount = useMemo(() => {
    if (!selectedAccountId) return null;
    return accounts.find((a) => a.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);

  const overviewPayload: OverviewPayload | null = useMemo(() => {
    // OverviewCard.tsx 側が null/undefined を許容して落ちない設計なので、ここも安全に
    const latestMonth =
      monthly && monthly.length > 0 ? monthly[monthly.length - 1] : null;

    return {
      cashAccountId: selectedAccountId ?? undefined,
      accountName: selectedAccount?.name ?? "—",
      currentBalance:
        typeof selectedAccount?.current_balance === "number"
          ? selectedAccount.current_balance
          : 0,
      thisMonthIncome: latestMonth?.income ?? 0,
      thisMonthExpense: latestMonth?.expense ?? 0,
      net: (latestMonth?.income ?? 0) - (latestMonth?.expense ?? 0),
    };
  }, [monthly, selectedAccount, selectedAccountId]);

  const onLogout = useCallback(async () => {
    try {
      await fetch("/auth/signout", { method: "POST" });
    } catch {
      // 失敗しても詰まらせない
    }
    router.refresh();
    router.push("/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="text-lg font-semibold">Cashflow Dashboard</div>

        <button
          type="button"
          onClick={onLogout}
          className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Logout
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* ===== ステータス（CashStatusから表示） ===== */}
        <div className="rounded-lg border border-white/10 bg-white text-black p-4">
          <div className="font-semibold">{statusHeadline(cashStatus)}</div>
          <div className="text-sm mt-1">{statusBody(cashStatus)}</div>
          <div className="text-xs mt-2 text-black/60">
            updated: {cashStatus.updatedAtISO}
          </div>
        </div>

        {/* ===== データ取り込み（リンク集） ===== */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="font-semibold">データ取り込み</div>

          <ul className="mt-2 text-sm space-y-2">
            <li className="flex items-center justify-between gap-3">
              <div>
                <div className="text-white">楽天銀行 明細CSV</div>
                <div className="text-white/60 text-xs">
                  週1回、楽天銀行からCSVを手動ダウンロードしてアップロード
                </div>
              </div>
              <Link
                href="/cash/import/rakuten"
                className="inline-flex h-9 items-center justify-center rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white hover:bg-white/10"
              >
                アップロードへ
              </Link>
            </li>
          </ul>
        </div>

        {/* ===== アラート ===== */}
        {alertCards?.length > 0 ? (
          <div className="space-y-3">
            {alertCards.map((a, idx) => {
              const clickable = !!(a.href && a.actionLabel);
              return (
                <div
                  key={`${a.severity}-${idx}`}
                  className={`rounded-lg border p-4 ${severityStyle(a.severity)}`}
                >
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-sm mt-1 text-white/90">
                    {a.description}
                  </div>

                  {/* ✅ あなたの要望：シミュレーションへ飛ばさない（警告だけ） */}
                  {clickable ? (
                    <div className="mt-3">
                      <Link
                        href={a.href!}
                        className="inline-flex h-9 items-center justify-center rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white hover:bg-white/10"
                      >
                        {a.actionLabel}
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* ===== Dashboard 本体 ===== */}
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard payload={overviewPayload} />
          <BalanceCard />
          <EcoCharts />
        </div>

        {children}
      </div>
    </div>
  );
}