// app/login/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

type SearchParams = {
  next?: string;
  error?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await searchParams) as SearchParams;

  // 例: /login?next=/dashboard
  const nextPath = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/dashboard";

  // Vercel/ローカルで切り替えるために使う（必須）
  // - Vercel:  NEXT_PUBLIC_SITE_URL=https://cashflow-app-alpha.vercel.app
  // - Local:   NEXT_PUBLIC_SITE_URL=http://localhost:3000
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL!
      : process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : "http://localhost:3000";

  // Magic Link の戻り先は必ず /auth/callback にする（ここが重要）
  const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  async function sendMagicLink(formData: FormData) {
    "use server";

    const supabase = await createClient();

    const email = String(formData.get("email") ?? "").trim();
    if (!email) {
      redirect(`/login?error=${encodeURIComponent("Email is required")}&next=${encodeURIComponent(nextPath)}`);
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(nextPath)}`);
    }

    // 送信できたら同じページでメッセージ表示
    redirect(`/login?next=${encodeURIComponent(nextPath)}&sent=1`);
  }

  // すでにログイン済みなら next へ
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(nextPath);

  const sent = (sp as any)?.sent === "1";
  const errorMsg = typeof sp.error === "string" ? sp.error : "";

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Login</h1>

      <p className="mt-2 text-sm text-neutral-400">
        Magic Link をメールで送ります。リンクを開くとログイン完了です。
      </p>

      {errorMsg ? (
        <div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {sent ? (
        <div className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm text-emerald-200">
          メールを送信しました。受信箱（迷惑メールも）を確認してください。
        </div>
      ) : null}

      <form action={sendMagicLink} className="mt-6 grid gap-3">
        <label className="grid gap-2">
          <span className="text-sm text-neutral-300">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <button
          type="submit"
          className="mt-2 inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
        >
          Send Magic Link
        </button>

        <div className="text-xs text-neutral-500">
          Redirect: <code>{emailRedirectTo}</code>
        </div>
      </form>
    </main>
  );
}