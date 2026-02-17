// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/set-password" || // 初回PW設定ページは通す（ログイン済み前提）
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api")
  );
}

function isProtectedPath(pathname: string) {
  // いまのアプリ構造だと基本 /dashboard 配下だけ守ればOK
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/simulation") ||
    pathname.startsWith("/inventory")
  );
}

export async function middleware(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // まずは next のレスポンスを作る（ここにcookieが積まれる）
  const res = NextResponse.next();

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

  const publicPath = isPublicPath(pathname);
  const protectedPath = isProtectedPath(pathname);

  // --- 未ログインで保護領域へ → /login ---
  if (!user && protectedPath) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);

    // ✅ 重要：redirectレスポンスに res のcookieを引き継ぐ
    const redirectRes = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // --- ログイン済みで /login へ来たら → next優先で移動 ---
  if (user && pathname === "/login") {
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.search = "";

    const redirectRes = NextResponse.redirect(url);
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // --- must_set_password 強制（ログイン済みの場合だけ） ---
  // publicPath でも /set-password は許可して、それ以外は /set-password へ寄せる
  if (user && pathname !== "/set-password" && !pathname.startsWith("/auth")) {
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", user.id)
      .maybeSingle();

    // profilesが取れないのは致命的なので、取れない場合はログインへ戻す（安全側）
    if (profErr) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      const redirectRes = NextResponse.redirect(url);
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }

    if (prof?.must_set_password === true) {
      const url = req.nextUrl.clone();
      url.pathname = "/set-password";
      url.search = "";
      const redirectRes = NextResponse.redirect(url);
      res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
      return redirectRes;
    }
  }

  // 公開ページは通す（上の分岐で必要なredirectは済んでる）
  if (publicPath) return res;

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};