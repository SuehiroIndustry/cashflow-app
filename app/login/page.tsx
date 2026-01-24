'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

export default function LoginPage() {
  const router = useRouter()

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
    () => 'mt-3 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80',
    []
  )

  const login = async () => {
    if (loading) return

    setLoading(true)
    setMessage('ログイン処理を開始…')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error('signInWithPassword error:', error)
        setMessage(`ログイン失敗: ${error.message}`)
        return
      }

      // 念のためセッション確認（ここで null なら cookie/persist が死んでる）
      const { data: s } = await supabase.auth.getSession()
      const hasSession = !!s.session

      setMessage(`ログイン成功。session=${hasSession ? 'OK' : 'NG（要調査）'}。/dashboard へ移動…`)

      router.replace('/dashboard')
      router.refresh()
    } catch (e) {
      console.error(e)
      setMessage('ログイン処理で例外が発生。Console を見て。')
    } finally {
      setLoading(false)
    }
  }

  const forgot = async () => {
    if (loading) return

    setLoading(true)
    setMessage(null)

    try {
      if (!email) {
        setMessage('Email を入れて。')
        return
      }

      // ✅ redirect_to は /auth/callback のみ（今の成功パターン）
      const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })

      if (error) {
        console.error(error)
        setMessage(`リセットメール送信失敗: ${error.message}`)
      } else {
        setMessage('リセットメールを送った。最新メールのリンクだけ踏んで。')
      }
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
        />

        <button
          type="button"
          onClick={login}
          disabled={loading || !email || !password}
          className={`mt-5 ${btnClass}`}
        >
          {loading ? 'Loading...' : 'Login'}
        </button>

        <button type="button" onClick={forgot} disabled={loading || !email} className={`mt-3 ${btnClass}`}>
          Forgot password
        </button>

        {message && <div className={infoClass}>{message}</div>}
      </div>
    </div>
  )
}