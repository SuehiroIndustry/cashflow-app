// app/dashboard/DashboardClient.tsx
"use client";

import React from "react";
import Link from "next/link";

import type {
  AccountRow,
  MonthlyBalanceRow,
  CashStatus,
  AlertCard,
} from "./_types";

type Props = {
  accounts: AccountRow[];
  selectedAccountId: number | null;
  monthly: MonthlyBalanceRow[];
  cashStatus: CashStatus;
  alertCards: AlertCard[];
  children: React.ReactNode;
};

function ImportLinks() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 text-slate-900">
      <h2 className="text-sm font-semibold mb-2">データ取り込み</h2>

      <ul className="space-y-2 text-sm">
        <li>
          <Link
            href="/cash/import/rakuten"
            className="text-blue-600 hover:underline"
          >
            ▶ 楽天銀行 明細CSVアップロード
          </Link>
        </li>
      </ul>

      <p className="mt-3 text-xs text-slate-500">
        ※ 週1でCSVを手動アップロードする運用
      </p>
    </div>
  );
}

export default function DashboardClient({
  // page.tsx から渡されるもの（今はこのコンポーネント内では未使用でもOK）
  accounts,
  selectedAccountId,
  monthly,
  cashStatus,
  alertCards,
  children,
}: Props) {
  // 未使用警告が気になる場合の保険（ビルドでは落ちないけど、気持ち悪ければ）
  void accounts;
  void selectedAccountId;
  void monthly;
  void cashStatus;

  return (
    <div className="w-full text-slate-900">
      {/* アラート */}
      {Array.isArray(alertCards) && alertCards.length > 0 ? (
        <div className="mb-4 space-y-2">
          {alertCards.map((card, idx) => (
            <div
              key={(card as any)?.id ?? idx}
              className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-slate-900"
            >
              <div className="text-sm font-semibold">
                {(card as any)?.title ?? "アラート"}
              </div>
              {(card as any)?.description ? (
                <div className="mt-1 text-sm text-slate-700">
                  {(card as any).description}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* ✅ 追加：楽天CSVアップロードへの導線 */}
      <div className="mb-4">
        <ImportLinks />
      </div>

      {/* ダッシュボード本体（page.tsx から渡される children） */}
      {children}
    </div>
  );
}