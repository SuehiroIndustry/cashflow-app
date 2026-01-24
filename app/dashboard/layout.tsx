import { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="text-lg font-semibold">Cashflow Dashboard</div>
        <a
          href="/auth/signout"
          className="rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
        >
          Logout
        </a>
      </header>

      <main className="px-6 py-6">{children}</main>
    </div>
  );
}