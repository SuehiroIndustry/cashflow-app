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

  // セッションが無いと更新できない（URL直打ち等の対策）
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return { error: "セッションが確認できません。ログインし直してください。" };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  // ✅ cookie 更新が反映された状態でサーバー側から遷移させる
  redirect("/dashboard");
}