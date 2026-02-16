// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const pathname = req.nextUrl.pathname;

  // 認証フロー・公開ページ（ここは絶対に弾かない）
  const isPublic =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/set-password" || // ✅ 初回パスワード設定ページは公開扱い
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api");

  // 保護したい領域（必要なら増やす）
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/simulation") ||
    pathname.startsWith("/inventory");

  // 未ログインで保護領域に来たら /login へ
  if (!user && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // ここから先は「ログイン済み」の場合のみ、追加の制御をかける
  if (user) {
    // ✅ must_set_password を見て、初回ユーザーは必ず /set-password を通す
    // （profiles は「自分の行だけ select 可能」な RLS がある前提）
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", user.id)
      .maybeSingle();

    // profiles が読めない/無い場合は「強制しない」で安全側（ループ回避）
    const mustSetPassword =
      !profErr && prof?.must_set_password === true ? true : false;

    // ① 初回パスワード未設定なのに、set-password 以外へ行こうとしたら強制転送
    if (mustSetPassword && !isPublic && pathname !== "/set-password") {
      const url = req.nextUrl.clone();
      url.pathname = "/set-password";
      url.searchParams.set("next", pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }

    // ② 既にパスワード設定済みなのに /set-password に来たら、next か /dashboard へ
    if (!mustSetPassword && pathname === "/set-password") {
      const next = req.nextUrl.searchParams.get("next");
      const url = req.nextUrl.clone();
      url.pathname = next && next.startsWith("/") ? next : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // ③ ログイン済みで /login に来たら…
    //    - 初回未設定なら /set-password
    //    - そうでなければ next or /dashboard
    if (pathname === "/login") {
      const next = req.nextUrl.searchParams.get("next");
      const url = req.nextUrl.clone();

      if (mustSetPassword) {
        url.pathname = "/set-password";
        url.searchParams.set("next", next && next.startsWith("/") ? next : "/dashboard");
        return NextResponse.redirect(url);
      }

      url.pathname = next && next.startsWith("/") ? next : "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};