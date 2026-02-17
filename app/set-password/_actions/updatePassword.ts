"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

export async function updatePassword(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const newPassword = asString(formData.get("newPassword")).trim();
  const confirmPassword = asString(formData.get("confirmPassword")).trim();

  // --- バリデーション（ここが今落ちてるポイントの本丸） ---
  if (!newPassword || newPassword.length < 8) {
    throw new Error("パスワードは8文字以上にしてください");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("パスワード（確認）が一致しません");
  }

  // 1) Supabase Auth のパスワード更新
  const { error: pwErr } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (pwErr) {
    // Supabase側の代表的エラーを日本語に寄せる
    const msg = pwErr.message ?? "";
    if (msg.includes("New password should be different")) {
      throw new Error("新しいパスワードは現在のパスワードと別のものにしてください");
    }
    if (msg.toLowerCase().includes("password")) {
      throw new Error(`パスワード更新に失敗しました: ${msg}`);
    }
    throw new Error(`パスワード更新に失敗しました: ${msg}`);
  }

  // 2) ログイン中ユーザー取得
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error("ユーザー情報の取得に失敗しました（ログイン状態を確認してください）");
  }

  // 3) profiles.must_set_password を false に落とす
  const { error: profErr } = await supabase
    .from("profiles")
    .update({ must_set_password: false })
    .eq("id", user.id);

  if (profErr) {
    throw new Error(`profiles 更新に失敗しました: ${profErr.message}`);
  }

  // 4) 完了したらダッシュボードへ
  redirect("/dashboard");
}