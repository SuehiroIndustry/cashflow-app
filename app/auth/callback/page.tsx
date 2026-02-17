// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function parseHash(hash: string) {
  // hash: "#access_token=...&refresh_token=...&type=invite"
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new URLSearchParams(h);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 1) code パターン（PKCE）
      const search = new URLSearchParams(window.location.search);
      const code = search.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("exchangeCodeForSession error:", error);
          router.replace("/login");
          return;
        }
        router.replace("/");
        return;
      }

      // 2) hash パターン（implicit）
      const { access_token, refresh_token } = parseHash(window.location.hash);

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("setSession error:", error);
          router.replace("/login");
          return;
        }

        // hash を消して見た目も安全に
        window.history.replaceState({}, document.title, "/auth/callback");
        router.replace("/");
        return;
      }

      // 3) どっちも無い = ただ叩かれた/期限切れ等
      console.error("Auth callback: missing code and tokens", {
        href: window.location.href,
      });
      router.replace("/login");
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>Signing you in...</div>;
}