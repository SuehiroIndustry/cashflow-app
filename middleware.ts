// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set([
  "/login",
  "/auth/callback",
  "/favicon.ico",
]);

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.match(/\.(.*)$/)) return true; // .png .css .js etc
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 公開パスは素通し
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Response を作って cookies を反映できるようにする
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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

  // ここが本体：user を取りにいく（トークン更新も反映される）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ★保護：未ログインなら /login へ（next を付ける）
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search ?? ""));
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // 静的ファイル等は除外（あなたの現行のままでOK）
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};