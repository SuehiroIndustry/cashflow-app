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
      // ✅ まずは「ログインしてるか」だけ判定する（DBは触らない）
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      router.replace("/dashboard");
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>Loading...</div>;
}