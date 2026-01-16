// lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Next.js の cookies() はバージョン差で sync / async が揺れるので、
 * await しておけば両対応できる（await 非Promiseはそのまま値になる）。
 *
 * また Next の cookieStore.set が要求する sameSite 型が厳しいので正規化する。
 */

function normalizeSameSite(
  sameSite: CookieOptions["sameSite"]
): "lax" | "strict" | "none" | undefined {
  // supabase/ssr 側で boolean が混じるケースを吸収
  if (sameSite === true) return "strict";
  if (sameSite === false) return "lax";
  if (sameSite === "lax" || sameSite === "strict" || sameSite === "none")
    return sameSite;
  return undefined;
}

function normalizeCookieOptions(options?: CookieOptions): CookieOptions | undefined {
  if (!options) return undefined;
  return {
    ...options,
    sameSite: normalizeSameSite(options.sameSite),
  };
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });
}