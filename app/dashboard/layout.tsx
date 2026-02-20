// app/dashboard/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/login");
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("must_set_password")
    .eq("id", user.id)
    .maybeSingle();

  // 読めない/無い = 安全側に倒す（set-passwordへ）
  const mustSet = profErr ? true : profile?.must_set_password ?? true;
  if (mustSet) {
    redirect("/set-password");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Cashflow Dashboard</div>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded border border-white/15 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
              >
                Logout
              </button>
            </form>
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

              <Link className="hover:text-white" href="/dashboard/income">
                収支入力
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="px-6 pb-10">{children}</main>
    </div>
  );
}