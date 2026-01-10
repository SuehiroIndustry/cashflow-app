"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; // ←ここが存在してるか確認

export default function LoginClient() {
  const sp = useSearchParams();
  const urlError = sp.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ランタイムで createClient が死んでも、画面を真っ黒にしない
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setStatus(null);

    if (!supabase) {
      setErr("Supabase client is not available (createClient failed).");
      return;
    }

    if (!email.trim()) {
      setErr("メールアドレス入れて。");
      return;
    }

    setLoading(true);
    try {
      const origin = window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // 重要：callback 経由でセッション確立させる
          emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) throw error;
      setStatus("メール送った。リンク踏んで戻ってきて。");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Login</h1>

      {urlError && (
        <div style={{ marginBottom: 12, color: "salmon" }}>
          URL error: {urlError}
        </div>
      )}

      {err && (
        <div style={{ marginBottom: 12, color: "salmon", whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      {status && (
        <div style={{ marginBottom: 12, color: "lightgreen" }}>{status}</div>
      )}

      <form onSubmit={onSendMagicLink}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          style={{ width: "100%", padding: 10, marginBottom: 12 }}
        />
        <button type="submit" disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "Sending…" : "Send Magic Link"}
        </button>
      </form>
    </div>
  );
}