// app/set-password/_actions/updatePassword.ts
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeString(v: FormDataEntryValue | null) {
  return typeof v === "string" ? v : "";
}

function isSamePasswordErrorMessage(msg: string) {
  const m = (msg ?? "").toLowerCase();
  return m.includes("new password should be different");
}

export async function updatePassword(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // 認証チェック
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    redirect("/login");
  }

  // 入力取得
  const password = safeString(formData.get("password")).trim();
  const passwordConfirm = safeString(formData.get("passwordConfirm")).trim();

  // バリデーション
  if (password.length < 8) {
    throw new Error("パスワードは8文字以上にしてください");
  }
  if (password !== passwordConfirm) {
    throw new Error("パスワード確認が一致しません");
  }

  // 1) Supabase Auth のパスワード更新
  const { error: updErr } = await supabase.auth.updateUser({ password });

  if (updErr) {
    if (isSamePasswordErrorMessage(updErr.message)) {
      throw new Error(
        "前と違うパスワードにしてください（同じパスワードは使えません）"
      );
    }
    throw new Error(`パスワード更新に失敗しました: ${updErr.message}`);
  }

  // 2) must_set_password を解除（RLS再帰を避けるためRPCで実行）
  const { error: rpcErr } = await supabase.rpc("clear_must_set_password");

  if (rpcErr) {
    throw new Error(`profiles 更新に失敗しました: ${rpcErr.message}`);
  }

  // 3) 完了
  redirect("/dashboard");
}