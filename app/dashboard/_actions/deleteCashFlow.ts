"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type DeleteCashFlowInput = {
  id: number;
};

function getSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // noop
          }
        },
      },
    }
  );
}

export async function deleteCashFlow(input: DeleteCashFlowInput) {
  const supabase = getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("cash_flows").delete().eq("id", input.id);

  if (error) throw new Error(error.message);

  return { ok: true };
}