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
    (async () => {
      // URL（hash / code）からセッションを確定して保存する
      const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true })

      if (error) {
        console.error('getSessionFromUrl error:', error)
        router.replace('/login')
        return
      }

      // 念のためセッションが取れてるか確認
      const session = data?.session
      if (!session) {
        router.replace('/login')
        return
      }

      router.replace('/dashboard')
    })()
  }, [router])

  return <div style={{ padding: 24 }}>Signing you in...</div>
}
