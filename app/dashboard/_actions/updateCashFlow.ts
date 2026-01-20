"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { CashFlowUpdateInput } from "../_types";

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

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  // 更新でも type が落ちる事故を防ぐ（トリガもあるが二重ロック）
  const type = input.section;

  const { error } = await supabase
    .from("cash_flows")
    .update({
      cash_account_id: input.cash_account_id,
      date: input.date,
      section: input.section,
      type, // ここも入れておくのが安全（NOT NULL）
      amount: input.amount,
      cash_category_id: input.cash_category_id,
      description: input.description ?? null,
      is_projection: input.is_projection ?? false,
      // source_type/source_id は運用次第。manual運用ならここで触らない方が事故らない
    })
    .eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}