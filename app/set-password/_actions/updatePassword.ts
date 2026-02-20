"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type State = { error: string | null; ok?: boolean };

export async function updatePassword(
  _prev: State,
  formData: FormData
): Promise<State> {
  const cookieStore = await cookies(); // ✅ Next.js 16 は await 必要

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

  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return { error: "セッションが確認できません。招待メールのリンクから再度アクセスしてください。" };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  return { error: null, ok: true };
}