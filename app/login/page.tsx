'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string>('')

  const sendMagicLink = async () => {
    setMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (error) {
      setMsg(`送信失敗: ${error.message}`)
    } else {
      setMsg('送信OK。メールのリンクを開いてください。')
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Login (Magic Link)</h1>

      <input
        style={{ padding: 8, width: 360 }}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        autoComplete="email"
      />

      <button style={{ marginLeft: 8, padding: 8 }} onClick={sendMagicLink}>
        Send
      </button>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  )
}
