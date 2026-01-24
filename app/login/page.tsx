// app/login/page.tsx
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !loading && email.trim().length > 0 && password.length >= 8;
  }, [loading, email, password]);

  const login = async () => {
    if (!canSubmit) return;

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

    // Cookie が張られるのを待つ意味でも、素直に遷移（pushでもOK）
    window.location.href = "/dashboard";
  };

  const signup = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error(error);
      setMessage(`登録失敗: ${error.message}`);
      setLoading(false);
      return;
    }

    // Confirm email を ON にしてる場合、ここで「メール確認してね」になる
    setMessage("登録した。メール確認が必要な設定なら、受信箱/迷惑メールを確認して。");
    setLoading(false);
  };

  const forgot = async () => {
    if (!email.trim()) {
      setMessage("メールアドレスを入れて。");
      return;
    }

    setLoading(true);
    setMessage(null);

    // ✅ recovery の戻り先は /reset-password に固定
    const redirectTo = `${window.location.origin}/reset-password`;

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

  const onSubmit = async () => {
    if (mode === "login") return login();
    return signup();
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 bg-black text-neutral-100">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="text-2xl font-semibold text-neutral-100">Login</div>
        <div className="mt-2 text-sm text-neutral-300">
          Email + Password でログインします。
        </div>

        {/* mode switch */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            className={[
              "rounded-lg border px-3 py-2 text-sm",
              mode === "login"
                ? "border-neutral-600 bg-neutral-950 text-neutral-100"
                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800",
            ].join(" ")}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage(null);
            }}
            className={[
              "rounded-lg border px-3 py-2 text-sm",
              mode === "signup"
                ? "border-neutral-600 bg-neutral-950 text-neutral-100"
                : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800",
            ].join(" ")}
          >
            Sign up
          </button>
        </div>

        {/* Email */}
        <label className="mt-5 block text-sm text-neutral-200">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          inputMode="email"
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500"
        />

        {/* Password */}
        <label className="mt-4 block text-sm text-neutral-200">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8 chars)"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-neutral-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="mt-5 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Loading..." : mode === "login" ? "Login" : "Sign up"}
        </button>

        {/* Forgot */}
        <button
          type="button"
          onClick={forgot}
          disabled={loading || !email.trim()}
          className="mt-3 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-50"
        >
          Forgot password
        </button>

        {message && (
          <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-100">
            {message}
          </div>
        )}

        <div className="mt-4 text-xs text-neutral-500">
          ※ パスワードは8文字以上推奨。ログインできない場合は、まずリセットで再設定してから試す。
        </div>
      </div>
    </div>
  );
}