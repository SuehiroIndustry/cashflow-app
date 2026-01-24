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
      setMessage('更新しました。ログインします。')
      window.location.href = '/dashboard'
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-xl font-semibold">Reset Password</div>

        <label className="mt-4 block text-sm">New Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="new password"
          type="password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
        />

        <button
          onClick={update}
          disabled={loading || !password}
          className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>

        {message && <div className="mt-3 text-sm text-neutral-200">{message}</div>}
      </div>
    </div>
  )
}