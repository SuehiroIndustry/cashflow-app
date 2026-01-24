'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

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
      setLoading(false)
      return
    }

    // Cookie が書かれるのを待ってから遷移（保険）
    await supabase.auth.getSession()
    window.location.href = '/dashboard'
  }

  const signup = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error(error)
      setMessage(`登録失敗: ${error.message}`)
    } else {
      setMessage('登録した。次に Login を押して。')
    }

    setLoading(false)
  }

  const forgot = async () => {
    setLoading(true)
    setMessage(null)

    // ★ ここが超重要：必ず callback 経由
    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`

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
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-xl font-semibold">Login</div>
        <div className="mt-2 text-sm text-neutral-300">Email + Password でログインします。</div>

        <label className="mt-4 block text-sm">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />

        <label className="mt-3 block text-sm">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />

        <button
          onClick={login}
          disabled={loading || !email || !password}
          className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Login'}
        </button>

        <button
          onClick={signup}
          disabled={loading || !email || !password}
          className="mt-3 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          Sign up
        </button>

        <button
          onClick={forgot}
          disabled={loading || !email}
          className="mt-3 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          Forgot password
        </button>

        {message && <div className="mt-3 text-sm text-neutral-200">{message}</div>}
      </div>
    </div>
  )
}