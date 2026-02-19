'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // ✅ /login?next=... を client でだけ読む（useSearchParams禁止）
  const [nextPath, setNextPath] = useState<string>('/dashboard')

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const next = sp.get('next')
      if (next && next.startsWith('/')) setNextPath(next)
    } catch {
      // 何もしない（デフォルト /dashboard）
    }
  }, [])

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

  const hardGo = (path: string) => {
    window.location.href = path
  }

  const login = async () => {
    if (loading) return
    setLoading(true)
    setMessage('ログイン処理を開始…')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        console.error('signInWithPassword error:', error)
        setMessage(`ログイン失敗: ${error.message}`)
        return
      }

      // ✅ cookie/セッション反映を一回確認（なくても遷移はする）
      const { data, error: uErr } = await supabase.auth.getUser()
      if (uErr) console.error('getUser after login error:', uErr)

      setMessage(`ログイン成功。session=${data.user ? 'OK' : 'NG'}。遷移します…`)

      hardGo(nextPath || '/dashboard')
    } catch (e) {
      console.error(e)
      setMessage('ログイン処理で例外が発生。Console を見て。')
    } finally {
      setLoading(false)
    }
  }

  const signup = async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)

    try {
      // サインアップ後は通常ログインフローへ（ここは今のまま）
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const emailRedirectTo = `${origin}/auth/callback?next=/dashboard`

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo,
        },
      })

      if (error) {
        console.error(error)
        setMessage(`登録失敗: ${error.message}`)
      } else {
        setMessage('登録を認証します。確認メールが送付されていますのでご確認ください')
      }
    } finally {
      setLoading(false)
    }
  }

  const forgot = async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)

    try {
      const trimmed = email.trim()
      if (!trimmed) {
        setMessage('Email を入れて。')
        return
      }

      // ✅ Recovery は /reset-password に直接戻す（#access_token を拾える前提）
      // ここで origin を「確実に」作る（万一 window.location.origin が空でも壊れない）
      const origin = (() => {
        try {
          return new URL(window.location.href).origin
        } catch {
          return ''
        }
      })()

      if (!origin) {
        setMessage('origin の取得に失敗。URLが変。')
        return
      }

      const redirectTo = `${origin}/reset-password`

      // デバッグ用（今だけ）
      console.log('resetPasswordForEmail redirectTo:', redirectTo)

      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      })

      if (error) {
        console.error(error)
        setMessage(`リセットメール送信失敗: ${error.message}`)
      } else {
        setMessage('リセットメールを送った。受信箱/迷惑メールを確認して、最新メールのリンクだけ踏んで。')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black p-6 text-white shadow-xl">
        <div className="text-2xl font-semibold text-white">ログイン画面</div>
        <div className="mt-2 text-sm text-white/70">メールアドレスとパスワードでログインします。</div>
        <div className="mt-2 text-sm text-white/70">
          初回はメールアドレスとパスワードを入力して「初回登録」をクリックください
        </div>

        <label className="mt-5 block text-sm text-white/80">メールアドレス</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={inputClass}
        />

        <label className="mt-3 block text-sm text-white/80">パスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className={inputClass}
        />

        <button onClick={login} disabled={loading || !email || !password} className={`mt-5 ${btnClass}`}>
          {loading ? '処理中…' : 'ログイン'}
        </button>

        <button onClick={signup} disabled={loading || !email || !password} className={`mt-3 ${btnClass}`}>
          初回登録
        </button>

        <button onClick={forgot} disabled={loading || !email} className={`mt-3 ${btnClass}`}>
          パスワードを忘れたらこちら
        </button>

        {message && <div className={infoClass}>{message}</div>}
      </div>
    </div>
  )
}