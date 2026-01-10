"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginClient() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const error = sp.get("error");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const sendMagicLink = async () => {
    setLoading(true);
    setMsg(null);

    try {
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=/dashboard`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        setMsg(error.message);
        return;
      }

      setMsg("メールを送信しました。届いたリンクをこのブラウザで開いてください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-24 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-1 text-sm text-zinc-400">メールにMagic Linkを送ります。</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {msg && (
        <div className="mt-4 rounded-md border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-200">
          {msg}
        </div>
      )}

      <div className="mt-5 space-y-3">
        <label className="block text-sm text-zinc-300">Email</label>
        <input
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          className="w-full rounded-md bg-white py-2 text-sm font-medium text-black disabled:opacity-60"
          onClick={sendMagicLink}
          disabled={loading || !email}
        >
          {loading ? "Sending..." : "Send Magic Link"}
        </button>
      </div>
    </div>
  );
}