// app/auth/callback/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Signing you in...')

  const cardClass = useMemo(
    () =>
      [
        'w-full max-w-sm rounded-2xl border border-white/10',
        'bg-gradient-to-b from-white/10 to-black p-6',
        'text-white shadow-xl',
      ].join(' '),
    []
  )

  useEffect(() => {
    ;(async () => {
      try {
        const url = new URL(window.location.href)

        const code = url.searchParams.get('code')
        const type = url.searchParams.get('type') // recovery 判定
        const next = url.searchParams.get('next')

        if (!code) {
          console.error('No code in callback URL')
          window.location.href = '/login'
          return
        }

        // ✅ v2 正式API
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          console.error('exchangeCodeForSession error:', error)
          window.location.href = '/login'
          return
        }

        // 遷移先決定
        if (type === 'recovery') {
          window.location.href = '/reset-password'
          return
        }

        if (next && next.startsWith('/')) {
          window.location.href = next
          return
        }

        window.location.href = '/dashboard'
      } catch (e) {
        console.error(e)
        window.location.href = '/login'
      }
    })()
  }, [])

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className={cardClass}>
        <div className="text-lg font-semibold">Auth Callback</div>
        <div className="mt-2 text-sm text-white/70">{message}</div>
      </div>
    </div>
  )
}