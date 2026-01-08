'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const onSend = async () => {
    setError(null)

    const trimmed = email.trim()
    if (!trimmed) {
      setError('メールアドレスを入力してね')
      return
    }

    setStatus('sending')

    // ✅ redirect 先を明示（ここが “2) /login の送信側で redirect 先を明示” の本体）
    const origin = window.location.origin
    const emailRedirectTo = `${origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      setStatus('idle')
      setError(error.message)
      return
    }

    setStatus('sent')
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Login</h1>

      <div style={{ marginTop: 12 }}>
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 8, width: 320 }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={onSend} disabled={status === 'sending'} style={{ padding: '8px 12px' }}>
          {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
        </button>
      </div>

      {status === 'sent' && (
        <p style={{ marginTop: 12 }}>
          送ったよ。メールのリンクを開いてね（数分以内に！）。
        </p>
      )}

      {error && (
        <p style={{ marginTop: 12, color: 'salmon' }}>
          Error: {error}
        </p>
      )}
    </main>
  )
}