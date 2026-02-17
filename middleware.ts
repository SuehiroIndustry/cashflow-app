// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // ここを let にして、後で redirect response に差し替えても
  // cookies.setAll が “最新の response” に書き込めるようにする
  let res = NextResponse.next();

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // ✅ 認証フロー・公開ページ（ここは絶対に弾かない）
  const isPublic =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/set-password" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api");

  // ✅ 保護したい領域（必要なら増やす）
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/simulation") ||
    pathname.startsWith("/inventory");

  // 未ログインで保護領域に来たら /login へ
  if (!user && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    res = NextResponse.redirect(url);
  }

  // ログイン済みで /login に来たら next 優先で遷移
  if (user && pathname === "/login") {
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.search = "";
    res = NextResponse.redirect(url);
  }

  // 公開ページは素通し（明示）
  if (isPublic) {
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};