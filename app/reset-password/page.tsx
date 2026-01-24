// app/reset-password/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // recoveryリンクから来てセッションが張れてるか確認
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error(error);
        setMessage(`セッション取得失敗: ${error.message}`);
        setReady(true);
        return;
      }

      // recovery リンク直後はここで session が取れる想定
      if (!data.session) {
        setMessage(
          "リセット用セッションが見つからない。リンクが期限切れか、/reset-password が Redirect URL に許可されてない可能性が高い。もう一度リセットメールを送って。"
        );
        setReady(true);
        return;
      }

      setReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canUpdate = useMemo(() => {
    return (
      ready &&
      !loading &&
      newPassword.length >= 8 &&
      confirm.length >= 8 &&
      newPassword === confirm
    );
  }, [ready, loading, newPassword, confirm]);

  const updatePassword = async () => {
    if (!canUpdate) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error(error);
      setMessage(`更新失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("パスワードを更新した。ログイン画面に戻る。");
    setLoading(false);

    setTimeout(() => {
      window.location.href = "/login";
    }, 800);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 bg-black text-neutral-100">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-2xl font-semibold text-neutral-100">Reset password</div>
        <div className="mt-2 text-sm text-neutral-300">
          新しいパスワードを設定します（8文字以上）。
        </div>

        <label className="mt-5 block text-sm text-neutral-200">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="new password (min 8 chars)"
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500"
        />

        <label className="mt-4 block text-sm text-neutral-200">Confirm</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="confirm password"
          autoComplete="new-password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") updatePassword();
          }}
        />

        <button
          onClick={updatePassword}
          disabled={!canUpdate}
          className="mt-5 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>

        <div className="mt-3 text-xs text-neutral-400">
          ※ リンクが古いとセッションが取れず更新できない。うまくいかない時はリセットメールを送り直し。
        </div>

        {message && (
          <div className="mt-4 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}