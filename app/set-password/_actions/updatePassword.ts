// app/set-password/_actions/updatePassword.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v : "";
}

export async function updatePassword(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/login");
  }

  const password = safeString(formData.get("password")).trim();
  const passwordConfirm = safeString(formData.get("passwordConfirm")).trim();

  if (password.length < 8) {
    throw new Error("パスワードは8文字以上にしてください");
  }
  if (password !== passwordConfirm) {
    throw new Error("パスワード確認が一致しません");
  }

  const { error: updErr } = await supabase.auth.updateUser({ password });
  if (updErr) {
    throw new Error(`パスワード更新に失敗しました: ${updErr.message}`);
  }

  // must_set_password を解除
  const { error: profErr } = await supabase
    .from("profiles")
    .update({ must_set_password: false })
    .eq("id", user.id);

  if (profErr) {
    throw new Error(`profiles 更新に失敗しました: ${profErr.message}`);
  }

  redirect("/dashboard");
}