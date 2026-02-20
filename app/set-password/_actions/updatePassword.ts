"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

type State = { error: string | null };

export async function updatePassword(
  _prev: State,
  formData: FormData
): Promise<State> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    return { error: "パスワードは8文字以上にしてください。" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "確認用パスワードが一致しません。" };
  }

  // 現在ログイン中ユーザーの email を取得
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const email = userRes.user?.email;

  if (userErr || !email) {
    return { error: "セッションが確認できません。ログインし直してください。" };
  }

  // ① パスワード更新
  const { error: updErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updErr) {
    return { error: `更新に失敗しました: ${updErr.message}` };
  }

  // ② 直後にセッションが無効化/古いままになることがあるので、
  //    新パスワードでログインし直して cookie セッションを確実に張り直す
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: newPassword,
  });

  if (signInErr) {
    return {
      error:
        "パスワードは更新できましたが、再ログインに失敗しました。ログイン画面から新しいパスワードでログインしてください。",
    };
  }

  // ③ セッションが確実にある状態でダッシュボードへ
  redirect("/dashboard");
}