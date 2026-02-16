// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // ✅ response を可変にして、redirect の時も cookie を載せられるようにする
  let response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookies) {
        // ✅ 常に「最終的に返す response」に書く（redirectでもOK）
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const pathname = req.nextUrl.pathname;

  // 認証フロー・公開ページ（ここは絶対に弾かない）
  const isPublic =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/set-password" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api");

  // 保護したい領域
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/simulation") ||
    pathname.startsWith("/inventory");

  // ユーザー取得（ここで Supabase が必要な cookie を setAll することがある）
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // 未ログインで保護領域に来たら /login へ
  if (!user && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    response = NextResponse.redirect(url);
    return response;
  }

  // ログイン済みのときだけ、初回パスワード設定を強制
  if (user) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", user.id)
      .maybeSingle();

    // profiles が読めない/無い場合はループ防止で false 扱い
    const mustSetPassword = !profErr && prof?.must_set_password === true;

    // 初回パスワード未設定なら /set-password に強制
    if (mustSetPassword && pathname !== "/set-password" && !pathname.startsWith("/auth")) {
      const url = req.nextUrl.clone();
      url.pathname = "/set-password";
      url.searchParams.set("next", pathname + req.nextUrl.search);
      response = NextResponse.redirect(url);
      return response;
    }

    // 設定済みなのに /set-password に来たら戻す
    if (!mustSetPassword && pathname === "/set-password") {
      const next = req.nextUrl.searchParams.get("next");
      const url = req.nextUrl.clone();
      url.pathname = next && next.startsWith("/") ? next : "/dashboard";
      url.search = "";
      response = NextResponse.redirect(url);
      return response;
    }

    // ログイン済みで /login に来たら（next優先）
    if (pathname === "/login") {
      const next = req.nextUrl.searchParams.get("next");
      const url = req.nextUrl.clone();

      if (mustSetPassword) {
        url.pathname = "/set-password";
        url.searchParams.set("next", next && next.startsWith("/") ? next : "/dashboard");
      } else {
        url.pathname = next && next.startsWith("/") ? next : "/dashboard";
        url.search = "";
      }

      response = NextResponse.redirect(url);
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};