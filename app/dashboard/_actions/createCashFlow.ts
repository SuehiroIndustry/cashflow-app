"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { CashFlowCreateInput } from "../_types";

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
            // Server Action 内では set が無効ケースがあるが、致命ではない
          }
        },
      },
    }
  );
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  // DBのNOT NULL: type を必ず埋める（トリガもあるが、アプリ側も正す）
  const type = input.section;

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: input.cash_account_id,
    date: input.date,
    section: input.section, // '収入' / '支出'
    type,                  // NOT NULL
    amount: input.amount,
    cash_category_id: input.cash_category_id,
    description: input.description ?? null,
    source_type: input.source_type ?? "manual",
    source_id: input.source_id ?? null,
    is_projection: input.is_projection ?? false,
    // user_id は DB default(auth.uid()) に任せる前提
    // created_by / updated_by は必要ならここで user.id を入れる
  });

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
}