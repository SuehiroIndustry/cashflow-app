// app/set-password/_actions/updatePassword.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type State = { error: string | null };

export async function updatePassword(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // 入力チェック（ここで throw しない）
  if (!newPassword || newPassword.length < 8) {
    return { error: "パスワードは8文字以上にしてください" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "確認用パスワードが一致しません" };
  }

  const supabase = await createSupabaseServerClient();

  // セッション確認
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  const user = userRes?.user;

  if (userErr || !user) {
    return { error: "セッションが切れています。ログインし直してください。" };
  }

  // 1) auth のパスワード更新
  const { error: pwErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (pwErr) {
    return { error: pwErr.message || "パスワード更新に失敗しました" };
  }

  // 2) profiles のフラグ更新（must_set_password を false）
  const { error: profErr } = await supabase
    .from("profiles")
    .update({ must_set_password: false })
    .eq("id", user.id);

  if (profErr) {
    // ここも throw しない。画面に出す。
    return { error: `profiles 更新に失敗しました: ${profErr.message}` };
  }

  // 成功したらダッシュボードへ
  redirect("/dashboard");
}