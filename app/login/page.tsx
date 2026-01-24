// app/login/page.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canLogin = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading;
  }, [email, password, loading]);

  const canForgot = useMemo(() => {
    return email.trim().length > 0 && !loading;
  }, [email, loading]);

  const login = async () => {
    if (!canLogin) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error(error);
      setMessage(`ログイン失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    // 成功したら dashboard へ
    window.location.href = "/dashboard";
  };

  const forgot = async () => {
    if (!canForgot) return;

    setLoading(true);
    setMessage(null);

    // ✅ リセットは必ず /auth/callback を通す（cookie を確実に張るため）
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      console.error(error);
      setMessage(`リセットメール送信失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("リセットメールを送った。受信箱/迷惑メールを確認して。");
    setLoading(false);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 bg-black text-neutral-100">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-2xl font-semibold text-neutral-100">Login</div>
        <div className="mt-2 text-sm text-neutral-300">
          Email + Password でログインします。
        </div>

        <label className="mt-5 block text-sm text-neutral-200">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          inputMode="email"
          autoComplete="email"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500"
        />

        <label className="mt-4 block text-sm text-neutral-200">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          autoComplete="current-password"
          className="mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") login();
          }}
        />

        <button
          onClick={login}
          disabled={!canLogin}
          className="mt-5 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Login"}
        </button>

        <button
          onClick={forgot}
          disabled={!canForgot}
          className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          Forgot password
        </button>

        {message && (
          <div className="mt-4 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}