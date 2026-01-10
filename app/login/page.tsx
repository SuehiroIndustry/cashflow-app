// app/login/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const sp = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // /login?next=/dashboard みたいに来てもOK
  const nextPath = sp.get("next") ?? "/dashboard";
  const errorFromCallback = sp.get("error");

  useEffect(() => {
    if (errorFromCallback) {
      setMsg(`Login error: ${decodeURIComponent(errorFromCallback)}`);
    }
  }, [errorFromCallback]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      // ✅ 重要：必ず /auth/callback を通す
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
        nextPath
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        setMsg(error.message);
        setSent(false);
      } else {
        setSent(true);
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Unknown error");
      setSent(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h1>Login</h1>

      {msg && (
        <div style={{ margin: "12px 0", color: "tomato", whiteSpace: "pre-wrap" }}>
          {msg}
        </div>
      )}

      {sent ? (
        <div style={{ marginTop: 12 }}>
          <p>メールを送った。リンク踏んで戻ってきて。</p>
          <p style={{ opacity: 0.7, fontSize: 12 }}>
            もしまた /login に戻るなら、/auth/callback を経由できてない可能性が高い。
          </p>
        </div>
      ) : (
        <form onSubmit={sendMagicLink}>
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 12, margin: "12px 0" }}
            required
          />

          <button
            type="submit"
            disabled={loading}
            style={{ padding: "10px 14px" }}
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>
      )}
    </div>
  );
}