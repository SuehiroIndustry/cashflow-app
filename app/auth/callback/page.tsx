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
      // detectSessionInUrl は v2 でも有効（ただし万能ではないので自前でも拾う）
      detectSessionInUrl: true,
    },
  }
)

function parseHashParams(hash: string) {
  // hash は "#a=b&c=d" 形式
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(h)
}

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

        // query
        const code = url.searchParams.get('code')
        const typeQ = url.searchParams.get('type')
        const nextQ = url.searchParams.get('next')

        // hash（implicit系でここに access_token が来る）
        const hashParams = parseHashParams(window.location.hash || '')
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        const typeH = hashParams.get('type')
        const nextH = hashParams.get('next')

        const type = typeQ || typeH || null
        const next = nextQ || nextH || null

        // ① PKCE（code）で来てるなら exchange
        if (code) {
          setMessage('Exchanging code for session...')
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('exchangeCodeForSession error:', error)
            setMessage('Auth failed. Redirecting to login...')
            window.location.href = '/login'
            return
          }
        } else if (access_token && refresh_token) {
          // ② hash token（implicit）で来てるなら setSession
          setMessage('Setting session from tokens...')
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (error) {
            console.error('setSession error:', error)
            setMessage('Auth failed. Redirecting to login...')
            window.location.href = '/login'
            return
          }
        } else {
          // ③ どっちも無い：エラーが hash に載ってることがある
          const err = hashParams.get('error') || url.searchParams.get('error')
          const desc =
            hashParams.get('error_description') || url.searchParams.get('error_description')

          console.error('No code / token in callback URL', { err, desc, href: window.location.href })

          setMessage('No auth info found. Redirecting to login...')
          window.location.href = '/login'
          return
        }

        // URLをきれいに（#access_token や code を残さない）
        try {
          window.history.replaceState({}, '', '/auth/callback')
        } catch {
          // ignore
        }

        // ④ 遷移先決定
        if (type === 'recovery') {
          setMessage('Redirecting to reset password...')
          window.location.href = '/reset-password'
          return
        }

        if (next && next.startsWith('/') && !next.startsWith('//')) {
          setMessage('Redirecting...')
          window.location.href = next
          return
        }

        setMessage('Redirecting to dashboard...')
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