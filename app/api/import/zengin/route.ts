import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,

    // Supabase env 確認
    env: {
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? "SET"
        : null,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "SET"
        : null,
    },

    // 実行環境の補助情報
    runtime: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV ?? null,
    },
  });
}