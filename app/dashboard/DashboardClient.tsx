// app/dashboard/DashboardClient.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type {
  CashStatus,
  AlertCard,
  AccountRow,
  MonthlyBalanceRow,
} from "./_types";

type Props = {
  children: React.ReactNode;

  // ✅ 互換性のために受け取れるようにする（他ページが渡してくる）
  // ※ このコンポーネント内では使わなくてOK
  cashStatus?: CashStatus;
  alertCards?: AlertCard[];
  accounts?: AccountRow[];
  monthly?: MonthlyBalanceRow[];
};

export default function DashboardClient({ children }: Props) {
  const searchParams = useSearchParams();
  const cashAccountId = searchParams.get("cashAccountId") ?? "2";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold">Cashflow Dashboard</div>

          <nav className="flex items-center gap-2 text-sm">
            <Link
              href={`/dashboard?cashAccountId=${cashAccountId}`}
              className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href={`/dashboard/simulation?cashAccountId=${cashAccountId}`}
              className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              Simulation
            </Link>

            <Link
              href={`/dashboard/import?cashAccountId=${cashAccountId}`}
              className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              楽天銀行・明細インポート
            </Link>

            <Link
              href={`/dashboard/statement?cashAccountId=${cashAccountId}`}
              className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              楽天銀行・明細ビュー
            </Link>

            <Link
              href={`/dashboard/fixed-costs?cashAccountId=${cashAccountId}`}
              className="rounded-md px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              固定費設定
            </Link>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}