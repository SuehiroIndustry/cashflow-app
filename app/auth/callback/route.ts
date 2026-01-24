// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next"); // ✅ これで確実に行き先を制御
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  // 交換後の行き先（デフォルトは dashboard）
  const nextPath = safeNext ?? "/dashboard";

  // code 無しなら、行き先へ（reset-password への遷移も潰さない）
  if (!code) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  // 成功時のリダイレクト先を先に用意（cookie set の受け皿）
  const response = NextResponse.redirect(new URL(nextPath, request.url));

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

  // ✅ code → session (cookie) に交換
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // 失敗は login に返す（next は残してもいいがまずは単純に）
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}