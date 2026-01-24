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

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(`ログイン失敗: ${error.message}`)
    } else {
      // middleware / layout が拾って /dashboard に通す想定
      window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  const signup = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage(`登録失敗: ${error.message}`)
    } else {
      setMessage('登録しました。ログインを試してください。')
    }

    setLoading(false)
  }

  const forgotPassword = async () => {
    setLoading(true)
    setMessage(null)

    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setMessage(`再設定メール送信失敗: ${error.message}`)
    } else {
      setMessage('パスワード再設定メールを送りました。メールのリンクを開いてください。')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-xl font-semibold">Login</div>
        <div className="mt-2 text-sm text-neutral-300">Email + Password でログインします。</div>

        <label className="mt-4 block text-sm">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
          autoComplete="email"
          inputMode="email"
        />

        <label className="mt-4 block text-sm">Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
          autoComplete="current-password"
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
          className="mt-2 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Sign up'}
        </button>

        <button
          onClick={forgotPassword}
          disabled={loading || !email}
          className="mt-2 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Forgot password'}
        </button>

        {message && <div className="mt-3 text-sm text-neutral-200">{message}</div>}
      </div>
    </div>
  )
}