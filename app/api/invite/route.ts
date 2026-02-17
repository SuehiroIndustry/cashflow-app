// app/api/invite/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  email: string;
  tempPassword: string; // 仮パス（管理者が決めて渡す）
  orgId?: number; // 使わないなら送らなくてOK
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  // ここは「サーバーだけ」で動かす（service role を使う）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return bad("環境変数が不足しています（SUPABASE_SERVICE_ROLE_KEY 等）", 500);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("JSONが不正です");
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const tempPassword = (body.tempPassword ?? "").trim();

  if (!email) return bad("email が必要です");
  if (tempPassword.length < 8) return bad("tempPassword は8文字以上にしてください");

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 1) ユーザー作成（confirm済み + 仮パス設定）
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // ✅ これ重要（email/passwordログインを確実にする）
  });

  if (createErr) {
    // 既に存在するケースもあるので、分かりやすく返す
    return bad(`ユーザー作成に失敗: ${createErr.message}`, 400);
  }

  const userId = created.user?.id;
  if (!userId) return bad("user id が取得できませんでした", 500);

  // 2) profiles を用意（must_set_password=true）
  //    ※あなたのprofiles構造に合わせて、列が増えてるならここに足してOK
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      must_set_password: true,
      // org_id: body.orgId ?? 1,  // 必要なら
    },
    { onConflict: "id" }
  );

  if (profErr) {
    return bad(`profiles作成に失敗: ${profErr.message}`, 500);
  }

  // 3) user_roles（任意）
  // 必要なら uncomment
  /*
  const { error: roleErr } = await admin.from("user_roles").insert({
    user_id: userId,
    role: "member",
  });
  if (roleErr) return bad(`user_roles作成に失敗: ${roleErr.message}`, 500);
  */

  return NextResponse.json({
    ok: true,
    userId,
    email,
  });
}