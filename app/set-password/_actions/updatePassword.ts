"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type State = { error: string | null; ok?: boolean };

export async function updatePassword(
  _prev: State,
  formData: FormData
): Promise<State> {
  const supabase = await createSupabaseServerClient();

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) return { error: "パスワードは8文字以上にしてください。" };
  if (newPassword !== confirmPassword) return { error: "確認用パスワードが一致しません。" };

  // セッションが無いなら招待リンクが無効/期限切れなど
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    return { error: "セッションが確認できません。招待メールのリンクから再度アクセスしてください。" };
  }

  // パスワード更新 + 初回設定済みフラグ
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { password_set: true },
  });

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` };
  }

  return { error: null, ok: true };
}