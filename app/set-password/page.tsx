"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SetPasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("パスワードは8文字以上にしてください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();

      // セッション確認（直打ち対策）
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setError("セッションが確認できません。ログインし直してください。");
        return;
      }

      // ✅ パスワード更新 + 初回フラグを同時に立てる
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: { password_set: true },
      });

      if (updErr) {
        setError(`更新に失敗しました: ${updErr.message}`);
        return;
      }

      // ✅ これを入れないと dashboard 側が古い user_metadata を見ることがある
      await supabase.auth.refreshSession();

      router.replace("/dashboard");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow">
        <h1 className="text-xl font-semibold">パスワード設定</h1>
        <p className="mt-2 text-sm text-neutral-300">
          初回ログインのため、パスワードを設定してください。
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm mb-1">新しいパスワード</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-neutral-100 placeholder:text-neutral-500"
              placeholder="8文字以上"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">確認（もう一度）</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-neutral-100 placeholder:text-neutral-500"
              placeholder="同じパスワードを入力"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-neutral-100 text-neutral-900 font-semibold py-2 disabled:opacity-50"
          >
            {pending ? "更新中..." : "パスワードを更新"}
          </button>
        </form>
      </div>
    </div>
  );
}