'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type Status = 'idle' | 'loading' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const nextPath = useMemo(() => {
    // /login?next=%2F みたいに来た時の戻り先
    const n = searchParams.get('next')
    return n && n.startsWith('/') ? n : '/'
  }, [searchParams])

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string>('')

  const isValidEmail = (v: string) => {
    // 厳密じゃなくてOK：UIバリデーション用途
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = email.trim().toLowerCase()
    if (!isValidEmail(trimmed)) {
      setStatus('error')
      setMessage('メールアドレスの形式が正しくない。')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed, next: nextPath }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        error?: string
      }

      if (!res.ok) {
        setStatus('error')
        setMessage(data?.error ?? 'ログインリンク送信に失敗した。')
        return
      }

      setStatus('sent')
      setMessage('ログインリンクを送った。メールを開いてリンクをクリックして。')
    } catch (err) {
      setStatus('error')
      setMessage('通信エラー。ネットワークかサーバーを確認して。')
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div
        style={{
          width: 'min(420px, 100%)',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 22, fontWeight: 700 }}>Login</h1>
        <p style={{ marginTop: 0, marginBottom: 20, color: 'rgba(0,0,0,0.65)', lineHeight: 1.5 }}>
          メールアドレスを入れると、Magic Link を送る。
          <br />
          パスワードは不要。
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.7)' }}>email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading' || status === 'sent'}
              style={{
                height: 44,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.2)',
                outline: 'none',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={status === 'loading' || status === 'sent'}
            style={{
              height: 44,
              borderRadius: 10,
              border: 'none',
              cursor: status === 'loading' || status === 'sent' ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              opacity: status === 'loading' || status === 'sent' ? 0.6 : 1,
            }}
          >
            {status === 'loading' ? 'Sending…' : status === 'sent' ? 'Sent' : 'Send magic link'}
          </button>

          {message && (
            <div
              role="status"
              style={{
                marginTop: 4,
                padding: 12,
                borderRadius: 10,
                background:
                  status === 'error' ? 'rgba(255,0,0,0.06)' : 'rgba(0,128,0,0.06)',
                border:
                  status === 'error'
                    ? '1px solid rgba(255,0,0,0.18)'
                    : '1px solid rgba(0,128,0,0.18)',
                color: status === 'error' ? 'rgba(120,0,0,0.95)' : 'rgba(0,80,0,0.95)',
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          {status === 'sent' && (
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                height: 44,
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.2)',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Back to home
            </button>
          )}
        </form>

        <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>
          ※ メールが来ない時：迷惑メール / プロモーション / 受信拒否設定 を確認。
        </div>
      </div>
    </main>
  )
}