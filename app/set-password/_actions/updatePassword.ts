// app/set-password/_actions/updatePassword.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function assertEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL が未設定です");
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY が未設定です");
  return { url, service };
}

export async function updatePassword(formData: FormData): Promise<void> {
  const newPassword = String(formData.get("newPassword") ?? "").trim();

  if (newPassword.length < 8) {
    throw new Error("パスワードは8文字以上にしてください");
  }

  // 1) 本人セッション（cookie付き）で auth のパスワードを更新
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error("ログイン状態を確認できません。ログインし直してください。");
  }

  const { error: pwErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (pwErr) {
    throw new Error(`パスワード更新に失敗しました: ${pwErr.message}`);
  }

  // 2) profiles.must_set_password を service role で false（RLS回避）
  const { url, service } = assertEnv();
  const admin = createClient(url, service, { auth: { persistSession: false } });

  const { error: profErr } = await admin
    .from("profiles")
    .update({ must_set_password: false })
    .eq("id", user.id);

  if (profErr) {
    throw new Error(`profiles 更新に失敗しました: ${profErr.message}`);
  }

  redirect("/dashboard");
}