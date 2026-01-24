// app/reset-password/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ✅ “色が消える”事故を潰す（暗黙依存しない）
  const inputClass = useMemo(
    () =>
      [
        "mt-1 w-full rounded-md border px-3 py-2",
        "border-white/10 bg-black/40",
        "text-white placeholder:text-white/35",
        "outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10",
      ].join(" "),
    []
  );

  const btnClass = useMemo(
    () =>
      [
        "w-full rounded-md border px-3 py-2 text-sm",
        "border-white/15 bg-white/5 text-white",
        "hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5",
      ].join(" "),
    []
  );

  const infoClass = useMemo(
    () =>
      "mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80",
    []
  );

  useEffect(() => {
    // ✅ recovery セッションが確立してるか確認（無ければログインへ）
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error(error);

      if (!data.session) {
        // セッション無し＝リセットリンクが期限切れ/別ブラウザ等
        window.location.href = "/login";
        return;
      }
      setChecking(false);
    })();
  }, []);

  const submit = async () => {
    setMessage(null);

    if (!password || password.length < 8) {
      setMessage("パスワードは8文字以上にして。");
      return;
    }
    if (password !== password2) {
      setMessage("確認用パスワードが一致してない。");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error(error);
      setMessage(`変更失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("変更OK。ログインし直します。");
    // 変更後は dashboard へ（必要なら login 経由でもOK）
    window.location.href = "/dashboard";
  };

  if (checking) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black p-6 text-white shadow-xl">
          <div className="text-lg font-semibold text-white">Reset password</div>
          <div className="mt-2 text-sm text-white/70">セッション確認中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black p-6 text-white shadow-xl">
        <div className="text-2xl font-semibold text-white">Reset password</div>
        <div className="mt-2 text-sm text-white/70">
          新しいパスワードを設定します。
        </div>

        <label className="mt-5 block text-sm text-white/80">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8文字以上"
          autoComplete="new-password"
          className={inputClass}
        />

        <label className="mt-3 block text-sm text-white/80">
          Confirm password
        </label>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="もう一度"
          autoComplete="new-password"
          className={inputClass}
        />

        <button
          onClick={submit}
          disabled={loading || !password || !password2}
          className={`mt-5 ${btnClass}`}
        >
          {loading ? "Loading..." : "Update password"}
        </button>

        {message && <div className={infoClass}>{message}</div>}
      </div>
    </div>
  );
}