// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  // codeが無いならログインへ
  if (!code) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  const { supabase, response } = createClient(request)

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  // 交換失敗ならログインへ
  if (error) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  // 成功 → ダッシュボードへ（cookieはresponseに乗ってる）
  return NextResponse.redirect(new URL('/dashboard', url.origin), {
    headers: response.headers,
  })
}