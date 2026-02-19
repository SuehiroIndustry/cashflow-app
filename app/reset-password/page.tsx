'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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

  const submit = async () => {
    if (loading) return
    setLoading(true)
    setMessage(null)

    if (!password || password.length < 8) {
      setMessage('パスワードは8文字以上にして。')
      setLoading(false)
      return
    }
    if (password !== password2) {
      setMessage('確認用パスワードが一致してない。')
      setLoading(false)
      return
    }

    // ✅ recovery セッションで updateUser が通る
    const { data, error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error('updateUser error:', error)
      setMessage(`更新失敗: ${error.message}`)
      setLoading(false)
      return
    }

    // 念のためセッション確認（更新後にセッションがあるか）
    const { data: s } = await supabase.auth.getSession()
    console.log('updateUser ok', { data, session: s?.session })

    // ✅ must_set_password を落とす（Dashboardが /set-password 強制するのを止める）
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser()
      if (userErr) {
        console.error('getUser after update error:', userErr)
      } else if (userData.user) {
        const { error: profUpErr } = await supabase
          .from('profiles')
          .update({ must_set_password: false })
          .eq('id', userData.user.id)

        if (profUpErr) {
          console.error('profiles update error:', profUpErr)
          // ここで止めない。パスワード変更は成功してるので、ログインに戻す
        }
      }
    } catch (e) {
      console.error('profiles update exception:', e)
      // ここで止めない
    }

    setMessage('パスワード更新OK。ログイン画面に戻る。')

    // ✅ reset-password は一度きりでOK。ログアウトして login に戻す（状態を綺麗に）
    try {
      await supabase.auth.signOut()
    } catch {
      // 無視
    }

    setLoading(false)
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-black p-6 text-white shadow-xl">
        <div className="text-2xl font-semibold text-white">Reset password</div>
        <div className="mt-2 text-sm text-white/70">新しいパスワードを設定します。</div>

        <label className="mt-5 block text-sm text-white/80">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8+ characters"
          autoComplete="new-password"
          className={inputClass}
        />

        <label className="mt-3 block text-sm text-white/80">Confirm password</label>
        <input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="repeat"
          autoComplete="new-password"
          className={inputClass}
        />

        <button onClick={submit} disabled={loading} className={`mt-5 ${btnClass}`}>
          {loading ? 'Updating...' : 'Update password'}
        </button>

        {message && <div className={infoClass}>{message}</div>}
      </div>
    </div>
  )
}