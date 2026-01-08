'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      // Supabase v2: magic link / OAuth では ?code=... を受け取って exchange する
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (!code) {
        // code がない = コールバックURL直叩き等
        router.replace('/login')
        return
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('exchangeCodeForSession error:', error)
        router.replace('/login')
        return
      }

      router.replace('/dashboard')
    })()
  }, [router])

  return <div style={{ padding: 24 }}>Signing you in...</div>
}