// app/set-password/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updatePassword } from "./_actions/updatePassword";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 text-white">
      <h1 className="text-xl font-semibold mb-6">初回パスワード設定</h1>

      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5">
        <p className="text-sm text-neutral-300 mb-4">
          初回ログインのため、パスワードを設定してください。
        </p>

        <form action={updatePassword} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">新しいパスワード</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md bg-black border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-500"
              placeholder="8文字以上"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">新しいパスワード（確認）</label>
            <input
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md bg-black border border-neutral-700 px-3 py-2 text-white placeholder:text-neutral-500"
              placeholder="もう一度入力"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-white text-black font-semibold py-2"
          >
            設定して続行
          </button>
        </form>
      </div>
    </div>
  );
}