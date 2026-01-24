// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_PAGES = ["/login"];

// 🔑 middleware から完全除外するパス
const PUBLIC_PATHS = ["/auth/callback", "/reset-password"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // ✅ recovery / callback は一切触らない
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未ログインで保護ページ
  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // ログイン済みで login
  if (user && isAuthPage(pathname)) {
    const url = request.nextUrl.clone();
    const next = url.searchParams.get("next") || "/dashboard";
    url.pathname = next;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};