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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const login = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error(error)
      setMessage(`ログイン失敗: ${error.message}`)
    } else {
      window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  const forgot = async () => {
    setLoading(true)
    setMessage(null)

    const redirectTo = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      console.error(error)
      setMessage(`リセットメール送信失敗: ${error.message}`)
    } else {
      setMessage('リセットメールを送った。受信箱/迷惑メールを確認して。')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      {/* ここで text 色を固定（更新しても絶対に黒字にならない） */}
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-white">
        <div className="text-xl font-semibold">Login</div>
        <div className="mt-2 text-sm text-neutral-300">Email + Password でログインします。</div>

        <label className="mt-4 block text-sm text-neutral-200">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white placeholder:text-neutral-500 outline-none focus:border-neutral-400"
        />

        <label className="mt-3 block text-sm text-neutral-200">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-white placeholder:text-neutral-500 outline-none focus:border-neutral-400"
        />

        <button
          onClick={login}
          disabled={loading || !email || !password}
          className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Login'}
        </button>

        <button
          onClick={forgot}
          disabled={loading || !email}
          className="mt-3 w-full rounded border border-neutral-700 px-3 py-2 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Forgot password
        </button>

        {message && <div className="mt-3 text-sm text-neutral-200">{message}</div>}
      </div>
    </div>
  )
}