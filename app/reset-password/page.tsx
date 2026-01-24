'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const update = async () => {
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(`更新失敗: ${error.message}`)
    } else {
      setMessage('更新しました。ダッシュボードへ移動します。')
      window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-lg">
        <div className="text-xl font-semibold text-neutral-100">Reset Password</div>
        <div className="mt-2 text-sm text-neutral-300">新しいパスワードを設定します。</div>

        <label className="mt-5 block text-sm text-neutral-200">New Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="new password"
          type="password"
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-400"
        />

        <button
          onClick={update}
          disabled={loading || !password}
          className="mt-5 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>

        {message && (
          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}