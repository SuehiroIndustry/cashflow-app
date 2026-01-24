'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  const signUp = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('登録完了。Login を押してください。')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow">
        <h1 className="text-lg font-bold">Login</h1>

        <input
          className="mt-4 w-full border px-3 py-2"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          className="mt-2 w-full border px-3 py-2"
          placeholder="password（8文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signIn}
          disabled={loading}
          className="mt-4 w-full bg-black py-2 text-white"
        >
          Login
        </button>

        <button
          onClick={signUp}
          disabled={loading}
          className="mt-2 w-full border py-2"
        >
          Sign up
        </button>

        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>
    </div>
  )
}