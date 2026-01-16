// lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type CookieStoreLike = {
  getAll: () => Array<{ name: string; value: string }>;
  set: (
    name: string,
    value: string,
    options?: {
      path?: string;
      domain?: string;
      maxAge?: number;
      expires?: Date;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none';
    }
  ) => void;
};

async function getCookieStore(): Promise<CookieStoreLike> {
  // Next.js のバージョンにより cookies() が Promise を返す/返さないが混在する
  const maybe = cookies() as unknown;
  const store = maybe instanceof Promise ? ((await maybe) as CookieStoreLike) : (maybe as CookieStoreLike);
  return store;
}

export async function createSupabaseServerClient() {
  const cookieStore = await getCookieStore();

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
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}