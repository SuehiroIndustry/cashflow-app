"use client";

import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginClient() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const supabase = createClient();

  async function sendMagicLink(email: string) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });
  }

  return (
    <div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {/* フォーム */}
    </div>
  );
}