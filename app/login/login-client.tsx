"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function getSiteUrl(): string {
  // 優先順位: NEXT_PUBLIC_SITE_URL -> window.origin
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.startsWith("http")) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function LoginClient() {
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  const errorMsg = sp.get("error");
  const infoMsg = sp.get("message");

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createBrowserClient(url, key);
  }, []);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalMsg(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setLocalMsg("メールアドレスを入力して。");
      return;
    }

    setLoading(true);
    try {
      const siteUrl = getSiteUrl();
      if (!siteUrl) {
        setLocalMsg("SITE_URL が取れない。Vercel の環境変数 NEXT_PUBLIC_SITE_URL を確認して。");
        return;
      }

      // 重要：redirect は /auth/callback に寄せる（ここでセッション確定処理をする）
      const emailRedirectTo = `${siteUrl}/auth/callback?next=/dashboard`;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo },
      });

      if (error) {
        setLocalMsg(error.message);
        return;
      }

      setLocalMsg("メールを送信しました。届いたリンクを開いてください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {(errorMsg || infoMsg) && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          {errorMsg ? (
            <span className="text-red-300">{decodeURIComponent(errorMsg)}</span>
          ) : (
            <span className="text-white/70">{decodeURIComponent(infoMsg ?? "")}</span>
          )}
        </div>
      )}

      {localMsg && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          {localMsg}
        </div>
      )}

      <form onSubmit={onSend} className="space-y-3">
        <label className="block text-sm text-white/70">Email</label>
        <input
          className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white text-black py-2 font-medium disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send Magic Link"}
        </button>

        <p className="text-xs text-white/50">
          ※リンクが /login に戻る問題は、redirect_to が <code>/auth/callback</code> になってないのが主因。
          ここで確実に <code>/auth/callback</code> に寄せてる。
        </p>
      </form>
    </div>
  );
}