// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type NextSameSite = 'lax' | 'strict' | 'none';

type CookieSetOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: NextSameSite; // ✅ boolean を入れない（Nextのcookiesが拒否する）
};

function normalizeSameSite(v: unknown): NextSameSite | undefined {
  // supabase/ssr 側が SerializeOptions 互換で boolean を渡してくる場合があるので吸収する
  if (v === true) return 'strict';
  if (v === false) return 'lax';
  if (v === 'lax' || v === 'strict' || v === 'none') return v;
  return undefined;
}

function normalizeCookieOptions(options: unknown): CookieSetOptions | undefined {
  if (!options || typeof options !== 'object') return undefined;
  const o = options as Record<string, unknown>;

  return {
    path: typeof o.path === 'string' ? o.path : undefined,
    domain: typeof o.domain === 'string' ? o.domain : undefined,
    maxAge: typeof o.maxAge === 'number' ? o.maxAge : undefined,
    expires: o.expires instanceof Date ? o.expires : undefined,
    httpOnly: typeof o.httpOnly === 'boolean' ? o.httpOnly : undefined,
    secure: typeof o.secure === 'boolean' ? o.secure : undefined,
    sameSite: normalizeSameSite(o.sameSite),
  };
}

// ✅ Next.js 15 で cookies() が Promise になり得るため async
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // ✅ cookies().set は (name,value,options) より object 形式が型で安全
          const normalized = normalizeCookieOptions(options);
          cookieStore.set({
            name,
            value,
            ...(normalized ?? {}),
          });
        });
      },
    },
  });
}