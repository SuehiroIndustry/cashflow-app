// app/reset-password/page.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return password.length >= 8 && password === password2;
  }, [password, password2]);

  const onSubmit = async () => {
    setLoading(true);
    setMessage(null);

    // callback でセッション/cookie が張れてる前提
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session) {
      setMessage("セッションが無い。リセットリンクをもう一度開き直して。");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(`更新失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("パスワードを更新した。ログイン画面へ移動する。");
    setLoading(false);

    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-100">
        <div className="text-xl font-semibold">Reset Password</div>
        <div className="mt-2 text-sm text-neutral-300">
          新しいパスワードを設定します（8文字以上推奨）。
        </div>

        <label className="mt-4 block text-sm text-neutral-200">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="new password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500"
        />

        <label className="mt-3 block text-sm text-neutral-200">Confirm</label>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="confirm password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500"
        />

        <button
          onClick={onSubmit}
          disabled={loading || !canSubmit}
          className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>

        {message && <div className="mt-3 text-sm text-neutral-200">{message}</div>}
        {!canSubmit && (
          <div className="mt-2 text-xs text-neutral-400">
            ※ 8文字以上 & 2つが一致している必要があります
          </div>
        )}
      </div>
    </div>
  );
}