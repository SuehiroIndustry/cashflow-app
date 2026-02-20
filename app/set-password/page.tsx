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

      // 1) セッション確認
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const user = userRes.user;
      if (userErr || !user) {
        setError("セッションが確認できません。ログインし直してください。");
        return;
      }

      // 2) パスワード更新（＋任意で user_metadata も立てる）
      const { error: updErr } = await supabase.auth.updateUser({
        password: newPassword,
        data: { password_set: true },
      });
      if (updErr) {
        setError(`更新に失敗しました: ${updErr.message}`);
        return;
      }

      // 3) profiles.must_set_password を false にする（無いなら作って false）
      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, must_set_password: false },
          { onConflict: "id" }
        );

      if (upsertErr) {
        setError(
          `プロフィール更新に失敗しました: ${upsertErr.message}\n（管理者にRLS/権限設定の確認が必要です）`
        );
        return;
      }

      // 4) 念のためセッション更新
      await supabase.auth.refreshSession();

      // 5) ダッシュボードへ
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
          <div className="mt-4 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200 whitespace-pre-line">
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