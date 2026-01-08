import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const origin = url.origin

  // code がないならログインへ
  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // 先にリダイレクト用レスポンスを作る（ここに cookie をセットする）
  const response = NextResponse.redirect(`${origin}/dashboard`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // code をセッションに交換して cookie を response に載せる
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  // 失敗したら login に逃がす（無限ループ防止）
  if (error) {
    return NextResponse.redirect(`${origin}/login`)
  }

  return response
}