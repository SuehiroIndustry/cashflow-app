'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // ★ ここが肝：Route Handler の exchangeCodeForSession を成立させる
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const sendMagicLink = async () => {
    setLoading(true)
    setMessage(null)

    // ★ 必ず /auth/callback に返す（Supabase側の Redirect URLs にも登録済みの前提）
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        // 連打しても古いリンクが死ぬだけなので、ここは触らない
      },
    })

    if (error) {
      console.error(error)
      setMessage(`送信に失敗: ${error.message}`)
    } else {
      setMessage('メールを送信しました。最新のメールのリンクを開いてください（迷惑メールも）。')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-xl font-semibold">Login</div>
        <div className="mt-2 text-sm text-neutral-300">
          メールに Magic Link を送ります。
        </div>

        <label className="mt-4 block text-sm">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
          autoComplete="email"
          inputMode="email"
        />

        <button
          onClick={sendMagicLink}
          disabled={loading || !email}
          className="mt-4 w-full rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>

        {message && (
          <div className="mt-3 text-sm text-neutral-200 whitespace-pre-wrap">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}