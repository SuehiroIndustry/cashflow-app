// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 1) セッション確認（未ログインなら login）
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        router.replace("/login");
        return;
      }

      // 2) profiles.must_set_password を確認
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("must_set_password")
        .eq("id", user.id)
        .maybeSingle();

      // profiles が取れない時は安全側で login に戻す
      if (profErr) {
        console.error("[/] profiles fetch error:", profErr);
        router.replace("/login");
        return;
      }

      // 3) 初回PW未設定なら set-password、済なら dashboard
      if (prof?.must_set_password === true) {
        router.replace("/set-password");
        return;
      }

      router.replace("/dashboard");
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>Loading...</div>;
}