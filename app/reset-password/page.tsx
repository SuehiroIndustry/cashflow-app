'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // callback で Cookie セッションが確定してる想定
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage('セッションが無い。リセットメールをもう一度やり直して。')
      }
    })
  }, [supabase])

  const update = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error(error)
      setMessage(`更新失敗: ${error.message}`)
      setLoading(false)
      return
    }

    setMessage('パスワード更新OK。ログインへ戻る。')
    setLoading(false)
    setTimeout(() => {
      window.location.href = '/login'
    }, 600)
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-xl font-semibold">Reset password</div>
        <div className="mt-2 text-sm text-neutral-300">新しいパスワードを設定します。</div>

        <label className="mt-4 block text-sm">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />

        <button
          onClick={update}
          disabled={loading || !password}
          className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update'}
        </button>

        {message && <div className="mt-3 text-sm text-neutral-200">{message}</div>}
      </div>
    </div>
  )
}