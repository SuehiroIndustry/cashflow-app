'use client'

import { useMemo, useState } from 'react'
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

  // ✅ “色が消える”事故を潰す（暗黙依存しない）
  const inputClass = useMemo(
    () =>
      [
        'mt-1 w-full rounded-md border px-3 py-2',
        'border-white/10 bg-black/40',
        'text-white placeholder:text-white/35',
        'outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10',
      ].join(' '),
    []
  )

  const btnClass = useMemo(
    () =>
      [
        'w-full rounded-md border px-3 py-2 text-sm',
        'border-white/15 bg-white/5 text-white',
        'hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5',
      ].join(' '),
    []
  )

  const infoClass = useMemo(
    () =>
      'mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80',
    []
  )

  // ✅ 絶対URLは“その場で”作る（SSR / Fast Refresh で壊れない）
  const getCallbackBase = () => `${window.location.origin}/auth/callback`

  const login = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const e = email.trim()

      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      })

      if (error) {
        console.error(error)
        setMessage(`ログイン失敗: ${error.message}`)
        return
      }

      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  const signup = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const e = email.trim()
      const callbackBase = getCallbackBase()

      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          // Confirm email ON の時に必要（OFFでも害はない）
          emailRedirectTo: `${callbackBase}?next=/dashboard`,
        },
      })

      if (error) {
        console.error(error)
        setMessage(`登録失敗: ${error.message}`)
        return
      }

      // Confirm email OFF なら session が返ることがある
      if (data.session) {
        window.location.href = '/dashboard'
        return
      }

      setMessage('登録OK。メール認証が必要なら、届いたメールを確認して。')
    } finally {
      setLoading(false)
    }
  }

  const forgot = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const e = email.trim()

      if (!e) {
        setMessage('Email を入れて。')
        return
      }

      // ✅ ここが肝：Supabase verify → /auth/callback → /reset-password に誘導
      const redirectTo = `${getCallbackBase()}?next=/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo,
      })

      if (error) {
        console.error(error)
        setMessage(`リセットメール送信失敗: ${error.message}`)
        return
      }

      setMessage('リセットメールを送った。受信箱/迷惑メールを確認して、最新メールのリンクだけ踏んで。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black p-6 text-white shadow-xl">
        <div className="text-2xl font-semibold text-white">Login</div>
        <div className="mt-2 text-sm text-white/70">Email + Password でログインします。</div>

        <label className="mt-5 block text-sm text-white/80">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          className={inputClass}
        />

        <label className="mt-3 block text-sm text-white/80">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className={inputClass}
          onKeyDown={(e) => {
            if (e.key === 'Enter') login()
          }}
        />

        <button onClick={login} disabled={loading || !email || !password} className={`mt-5 ${btnClass}`}>
          {loading ? 'Loading...' : 'Login'}
        </button>

        <button onClick={signup} disabled={loading || !email || !password} className={`mt-3 ${btnClass}`}>
          Sign up
        </button>

        <button onClick={forgot} disabled={loading || !email} className={`mt-3 ${btnClass}`}>
          Forgot password
        </button>

        {message && <div className={infoClass}>{message}</div>}
      </div>
    </div>
  )
}