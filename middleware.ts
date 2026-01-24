// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 保護したいパス
const PROTECTED_PREFIXES = ["/dashboard"];

// ログイン画面（ログイン済みならここに居させない）
const AUTH_PAGES = ["/login"];

// ✅ recovery / OAuth / magiclink の受け口と、パスワード再設定は「例外で通す」
const PUBLIC_PREFIXES = ["/auth/callback", "/reset-password"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ✅ ここは絶対に弾かない（cookieセット前に弾くと “ぐるぐる” する）
  if (startsWithAny(pathname, PUBLIC_PREFIXES)) {
    return NextResponse.next();
  }

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

  // セッション確認（必要なら refresh もここで動く）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログインで保護ページ => /login
  if (!user && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // ログイン済みで /login => /dashboard へ
  if (user && startsWithAny(pathname, AUTH_PAGES)) {
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