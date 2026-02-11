// app/dashboard/layout.tsx
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* ✅ 常に表示される上のバー（ここだけに統一） */}
      <header className="border-b border-white/10 bg-black">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Cashflow Dashboard</div>

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

              <span className="mx-1 text-white/30">|</span>

              <Link className="hover:text-white" href="/dashboard/simulation">
                Simulation
              </Link>

              <span className="mx-1 text-white/30">|</span>

              <Link className="hover:text-white" href="/dashboard/import">
                楽天銀行・明細インポート
              </Link>

              <span className="mx-1 text-white/30">|</span>

              <Link className="hover:text-white" href="/dashboard/statement">
                楽天銀行・明細ビュー
              </Link>

              <span className="mx-1 text-white/30">|</span>

              <Link className="hover:text-white" href="/dashboard/fixed-costs">
                固定費設定
              </Link>

              <span className="mx-1 text-white/30">|</span>

              <Link className="hover:text-white" href="/dashboard/entry">
                収支入力
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ✅ 各ページの表示領域 */}
      <main className="px-6 pb-10">{children}</main>
    </div>
  );
}