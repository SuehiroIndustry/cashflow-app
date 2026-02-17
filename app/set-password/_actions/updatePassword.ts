"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type State = { error: string | null };

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

export async function updatePassword(
  _prev: State,
  formData: FormData
): Promise<State> {
  const supabase = await createSupabaseServerClient();

  const newPassword = asString(formData.get("newPassword")).trim();
  const confirmPassword = asString(formData.get("confirmPassword")).trim();

  if (!newPassword || newPassword.length < 8) {
    return { error: "パスワードは8文字以上にしてください" };
  }
  if (newPassword !== confirmPassword) {
    return { error: "パスワード（確認）が一致しません" };
  }

  const { error: pwErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (pwErr) {
    return { error: `パスワード更新に失敗しました: ${pwErr.message}` };
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { error: "ユーザー情報の取得に失敗しました（ログイン状態を確認してください）" };
  }

  const { error: profErr } = await supabase
    .from("profiles")
    .update({ must_set_password: false })
    .eq("id", user.id);

  if (profErr) {
    return { error: `profiles 更新に失敗しました: ${profErr.message}` };
  }

  redirect("/dashboard");
}