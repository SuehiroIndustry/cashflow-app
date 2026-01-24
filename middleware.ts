// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ✅ ログイン必須にしたいページ（ここ以外は基本パブリック）
const PROTECTED_PREFIXES = ["/dashboard"];

// ✅ 認証まわりのページ（ログイン済みなら /dashboard へ飛ばす対象）
const AUTH_PAGES = ["/login"];

// ✅ “未ログインでも通していい”ページ
// recovery(パスワードリセット) と magiclink の受け口は絶対に弾かない
const PUBLIC_PAGES = ["/login", "/reset-password", "/auth/callback"];

function startsWithPath(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(base + "/");
}

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => startsWithPath(pathname, p));
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some((p) => startsWithPath(pathname, p));
}

function isPublicPage(pathname: string) {
  return PUBLIC_PAGES.some((p) => startsWithPath(pathname, p));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // ✅ 重要：auth/callback と reset-password は未ログインでも通す（recovery を潰さない）
  // ＝「保護ページ」判定より先に、public は素通しでもいいが、
  // 今回はロジック上、下の条件に "&& !isPublicPage" を足して事故を止める

  // 未ログインで保護ページ => /login へ（ただし public は除外）
  if (!user && isProtected(pathname) && !isPublicPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // ログイン済みで /login => next か /dashboard へ
  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get("next") || "/dashboard";
    url.pathname = next;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

// middleware対象（静的ファイル等を除外）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};