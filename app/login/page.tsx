// app/login/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  // すでにログイン済みなら /dashboard へ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  // useSearchParams を使うのは Client 側に寄せる（Suspense で包む）
  return (
    <main className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 mt-12 shadow">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="text-sm text-white/60 mt-1">
          メールにMagic Linkを送ります。
        </p>

        <div className="mt-6">
          <Suspense fallback={<div className="text-sm text-white/60">Loading…</div>}>
            <LoginClient />
          </Suspense>
        </div>
      </div>
    </main>
  );
}