"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginClient() {
  const sp = useSearchParams();
  const error = sp.get("error");
  const next = sp.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      // ここで落とすと原因が分かりやすい
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    return createBrowserClient(url, anon);
  }, []);

  const sendMagicLink = async () => {
    setMsg(null);
    if (!email) return;

    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // /auth/callback 側でセッション確立 → next に飛ばす想定
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (e) throw e;

      setMsg("Magic Link を送信しました。メールをご確認ください。");
    } catch (e: any) {
      setMsg(e?.message ?? "送信に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-white/70">メールに Magic Link を送ります。</p>

        {(error || msg) && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error ? `Error: ${error}` : msg}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <label className="block text-sm text-white/80" htmlFor="email">
            Email
          </label>

          {/* ★ここが「読めない」問題の本丸。背景を暗く、文字とプレースホルダを明るく */}
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="
              w-full rounded-md border border-white/15 bg-black/40
              px-3 py-2 text-white placeholder:text-white/40
              outline-none focus:border-white/35 focus:ring-2 focus:ring-white/10
            "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="
              w-full rounded-md bg-white py-2 text-sm font-medium text-black
              disabled:opacity-60
            "
            onClick={sendMagicLink}
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>

          <p className="text-xs text-white/50">
            迷惑メールに入ることがある。そこまで探して無かったら、メールサーバが拗ねてる。
          </p>
        </div>
      </div>
    </div>
  );
}