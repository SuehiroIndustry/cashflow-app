"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { CashFlowUpdateInput } from "../_types";

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

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  // DBの NOT NULL: type を必ず埋める（section をそのまま type に入れる運用）
  const type = input.section;

  const { error } = await supabase
    .from("cash_flows")
    .update({
      date: input.date,
      section: input.section,
      type,
      amount: input.amount,
      cash_category_id: input.cash_category_id,
      description: input.description ?? null,
    })
    .eq("id", input.id)
    .eq("cash_account_id", input.cash_account_id);

  if (error) throw new Error(error.message);

  return { ok: true };
}