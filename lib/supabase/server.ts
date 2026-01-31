// "@/lib/supabase/server.ts"
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js App Router（cookies async対応）版
 * - cookies() は Promise なので await 必須
 * - Server Component / Route Handler から安全に使える
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component では set が禁止されるケースがあるため握る
        }
      },
    },
  });
}

export const createClient = createSupabaseServerClient;