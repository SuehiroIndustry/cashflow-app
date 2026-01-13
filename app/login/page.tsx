import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LoginClient from "./login-client";

export default async function LoginPage() {
  // すでにログイン済みなら /dashboard へ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-6">
            Loading...
          </div>
        }
      >
        <LoginClient />
      </Suspense>
    </main>
  );
}