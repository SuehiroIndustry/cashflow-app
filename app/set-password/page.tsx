"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "./_actions/updatePassword";

type State = { error: string | null; ok?: boolean };

const initialState: State = { error: null };

export default function SetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    // ✅ サインアウトしない。更新後はそのままDashboardへ。
    router.replace("/dashboard");
  }, [state.ok, router]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow">
        <h1 className="text-xl font-semibold">パスワード設定</h1>
        <p className="mt-2 text-sm text-neutral-300">
          初回ログインのため、パスワードを設定してください。
        </p>

        {state.error && (
          <div className="mt-4 rounded-lg border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-200">
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm mb-1">新しいパスワード</label>
            <input
              name="newPassword"
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
              name="confirmPassword"
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