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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // 認証フロー・公開ページ（ここは絶対に弾かない）
  const isPublic =
    pathname === "/login" ||
    pathname === "/reset-password" ||
    pathname === "/set-password" ||
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

  // ログイン済みで /login に来たらダッシュボードへ（next優先）
  if (user && pathname === "/login") {
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ログイン済みの場合：初回パスワード設定の強制
  if (user && !isPublic) {
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", user.id)
      .maybeSingle();

    // profilesが読めない/無いなら、ここでは無理に弾かず素通し（事故防止）
    if (!profErr && profile?.must_set_password === true) {
      // /set-password 以外に来たら強制リダイレクト
      const url = req.nextUrl.clone();
      url.pathname = "/set-password";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // 逆に、must_set_password=false なのに /set-password に来たら /dashboard へ戻す
  if (user && pathname === "/set-password") {
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", user.id)
      .maybeSingle();

    if (!profErr && profile?.must_set_password === false) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
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