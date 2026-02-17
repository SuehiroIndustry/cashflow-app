// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const pathname = req.nextUrl.pathname;

  // 公開（認証フロー含む）
  const isPublic =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/set-password" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api");

  // 保護（今は /dashboard 配下だけ守ればOK）
  const isProtected = pathname.startsWith("/dashboard");

  // まず next を作る（ここにcookieが積まれる）
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

  // 未ログインで保護領域に来たら /login
  if (!user && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);

    const redirectRes = NextResponse.redirect(url);
    // res に積んだcookieを引き継ぐ
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c));
    return redirectRes;
  }

  // 公開ページは通す
  if (isPublic) return res;

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};