"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { CashFlowDeleteInput } from "../_types";

async function getSupabase() {
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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options as any);
              } catch {
                // noop
              }
            });
          } catch {
            // noop
          }
        },
      },
    }
  );
}

export async function deleteCashFlow(input: CashFlowDeleteInput) {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("cash_flows")
    .delete()
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw new Error(error.message);

  return { ok: true };
}