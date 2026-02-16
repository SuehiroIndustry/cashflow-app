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
  // ※ set-password を公開扱いに追加（招待リンクで入ってくる）
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

  // ログイン済みなら must_set_password をチェックして、初回は set-password 強制
  if (user) {
    // profiles は RLS で「自分の行を select」できる前提（無いと null になる）
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_set_password")
      .eq("id", user.id)
      .maybeSingle();

    const mustSet = profile?.must_set_password === true;

    // must_set_password=true なら /set-password へ強制（auth/api/reset は除外）
    if (mustSet && pathname !== "/set-password" && !isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = "/set-password";
      url.search = ""; // nextは要らない（必ずここを通す）
      return NextResponse.redirect(url);
    }

    // must_set_password=false で /set-password に来たら /dashboard へ
    if (!mustSet && pathname === "/set-password") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // ログイン済みで /login に来たらダッシュボードへ（next優先）
  if (user && pathname === "/login") {
    const next = req.nextUrl.searchParams.get("next");
    const url = req.nextUrl.clone();
    url.pathname = next && next.startsWith("/") ? next : "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};