// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        const code = url.searchParams.get("code");

        // 1) PKCE: ?code=... がある場合
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[/auth/callback] exchangeCodeForSession error:", error);
            router.replace("/login");
            return;
          }
        } else {
          // 2) Implicit: #access_token=... がある場合（invite / recovery で起きやすい）
          if (window.location.hash?.includes("access_token")) {
            // supabase-js v2
            // これがセッション保存までやってくれる
            // @ts-ignore
            const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
            if (error) {
              console.error("[/auth/callback] getSessionFromUrl error:", error);
              router.replace("/login");
              return;
            }
          }
        }

        // 3) セッションが入ったか確認
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // ここに来るなら callback 側でセッション作れてない
          router.replace("/login");
          return;
        }

        // 4) must_set_password を見て振り分け（既存ロジック踏襲）
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("must_set_password")
          .eq("id", user.id)
          .maybeSingle();

        if (profErr) {
          console.error("[/auth/callback] profiles fetch error:", profErr);
          router.replace("/dashboard");
          return;
        }

        if (prof?.must_set_password === true) {
          router.replace("/set-password");
          return;
        }

        router.replace("/dashboard");
      } catch (e) {
        console.error("[/auth/callback] unexpected error:", e);
        router.replace("/login");
      }
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>Signing you in...</div>;
}