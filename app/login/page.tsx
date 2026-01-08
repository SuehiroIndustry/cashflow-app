'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleLogin = async () => {
    if (!email) {
      setMessage('メールアドレスを入力してください')
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // ★ ここが今回の核心：redirect 先を明示
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error(error)
      setMessage('ログインに失敗しました')
    } else {
      setMessage('ログイン用のメールを送信しました')
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="email@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: 'block', marginBottom: 12 }}
      />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>

      {message && (
        <p style={{ marginTop: 12 }}>
          {message}
        </p>
      )}
    </div>
  )
}