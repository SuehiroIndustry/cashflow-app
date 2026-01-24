// app/auth/callback/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // PKCE/implicit どっちで返ってきても拾えるようにする
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");

  const cardClass = useMemo(
    () =>
      [
        "w-full max-w-sm rounded-2xl border border-white/10",
        "bg-gradient-to-b from-white/10 to-black p-6",
        "text-white shadow-xl",
      ].join(" "),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // next の行き先（/reset-password or /dashboard など）
        const nextParam = url.searchParams.get("next");
        const safeNext =
          nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
            ? nextParam
            : null;

        // recovery 判定：search/hash 両方見る（どっちで返ってくるか環境差がある）
        const isRecovery =
          url.searchParams.get("type") === "recovery" ||
          window.location.hash.includes("type=recovery");

        // ✅ ここが肝：URL からセッションを確定（PKCEでもimplicitでも拾う）
        // - code がある時は exchangeCodeForSession が内部で走る
        // - hash(#access_token...) の時も拾える
        const { data, error } = await supabase.auth.getSessionFromUrl({
          storeSession: true,
        });

        if (error) {
          console.error("getSessionFromUrl error:", error);
          setMessage("Auth failed. Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        // セッションが取れてないなら失敗扱い
        if (!data.session) {
          setMessage("No session found. Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        // ✅ 目的地決定
        // recovery は reset-password 優先
        const dest = isRecovery
          ? "/reset-password"
          : safeNext ?? "/dashboard";

        window.location.href = dest;
      } catch (e) {
        console.error(e);
        setMessage("Unexpected error. Redirecting to login...");
        window.location.href = "/login";
      }
    })();
  }, []);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className={cardClass}>
        <div className="text-lg font-semibold text-white">Auth Callback</div>
        <div className="mt-2 text-sm text-white/70">{message}</div>
      </div>
    </div>
  );
}