// app/dashboard/layout.tsx
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ここが「常に表示される上のバー」 */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Cashflow Dashboard</div>

          {/* 既存のLogoutが別の場所にあるなら、ここは消してOK */}
          <Link
            href="/auth/logout"
            className="rounded border border-white/15 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
          >
            Logout
          </Link>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm text-white/80">
            <Link className="hover:text-white" href="/dashboard">
              Dashboard
            </Link>

            <Link className="hover:text-white" href="/dashboard/simulation">
              Simulation
            </Link>

            <Link className="hover:text-white" href="/dashboard/import">
              楽天銀行・明細インポート
            </Link>

            <Link className="hover:text-white" href="/dashboard/fixed-costs">
              固定費設定
            </Link>

            <span className="mx-1 text-white/30">|</span>

            {/* 口座選択をクエリで維持してるなら、ここもクエリ付きリンクにしてOK */}
            <Link className="hover:text-white" href="/dashboard?cashAccountId=0">
              口座：全口座
            </Link>
          </nav>
        </div>
      </div>

      {/* 各ページの表示領域 */}
      <main className="px-6 pb-10">{children}</main>
    </div>
  );
}