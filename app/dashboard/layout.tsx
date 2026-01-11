// app/dashboard/layout.tsx
import { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  // 念のための二重ガード（middleware + layout）
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-lg font-semibold">Cashflow Dashboard</div>

        {/* ★ Logout 導線（Route Handler を叩くだけ） */}
        <a
          href="/auth/signout"
          className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
        >
          Logout
        </a>
      </header>

      {/* Main */}
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}