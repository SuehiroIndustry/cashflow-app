import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cashflow",
  description: "Cashflow Dashboard for decision making",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-neutral-950 text-neutral-100">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 border-r border-neutral-800 bg-neutral-900">
            <div className="p-4 font-semibold text-lg">Cashflow</div>
            <nav className="space-y-1 px-2">
              <a href="/dashboard" className="block rounded px-3 py-2 hover:bg-neutral-800">
                📊 Dashboard
              </a>
              <a href="/simulation" className="block rounded px-3 py-2 hover:bg-neutral-800">
                🧪 Simulation
              </a>
              <a href="/transactions" className="block rounded px-3 py-2 hover:bg-neutral-800">
                ✍️ Transactions
              </a>
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
              <div className="text-lg font-semibold">Cashflow Dashboard</div>
              <button className="rounded border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800">
                Logout
              </button>
            </header>

            {/* Page content */}
            <div className="p-6">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}