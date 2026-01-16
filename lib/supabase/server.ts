// lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date | string | number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
};

function normalizeSameSite(
  sameSite: CookieOptions['sameSite']
): 'lax' | 'strict' | 'none' | undefined {
  // supabase/ssr は boolean を返すことがあるが、Next の cookies().set は boolean を受けない
  if (sameSite === true) return 'strict';
  if (sameSite === false) return 'lax';
  return sameSite ?? undefined;
}

function normalizeCookieOptions(options: CookieOptions | undefined) {
  if (!options) return undefined;
  return {
    ...options,
    sameSite: normalizeSameSite(options.sameSite),
  };
}

// ✅ Next.js の cookies() が Promise になっている環境に対応するため async にする
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, normalizeCookieOptions(options));
          });
        },
      },
    }
  );
}