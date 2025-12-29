'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Callback() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(() => router.replace('/dashboard'))
  }, [router])
  return <p style={{ padding: 24 }}>ログイン処理中...</p>
}
