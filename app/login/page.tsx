'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const sendMagicLink = async () => {
    if (!email) return

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error(error)
      setMessage(`送信に失敗しました：${error.message}`)
    } else {
      setMessage('メールを送信しました。受信箱（迷惑メール含む）を確認してください。')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-300 bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-neutral-900">Login</h1>
        <p className="mt-1 text-sm text-neutral-600">
          メールに Magic Link を送ります
        </p>

        <label className="mt-4 block text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="
            mt-1
            w-full
            rounded-md
            border
            border-neutral-400
            bg-white
            px-3
            py-2
            text-neutral-900
            placeholder-neutral-400
            focus:outline-none
            focus:ring-2
            focus:ring-blue-500
          "
        />

        <button
          onClick={sendMagicLink}
          disabled={loading || !email}
          className="
            mt-4
            w-full
            rounded-md
            bg-blue-600
            px-4
            py-2
            text-sm
            font-medium
            text-white
            hover:bg-blue-700
            disabled:opacity-50
          "
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>

        {message && (
          <p className="mt-3 text-sm text-neutral-700">{message}</p>
        )}
      </div>
    </div>
  )
}