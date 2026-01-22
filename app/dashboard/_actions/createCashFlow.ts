"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { CashFlowCreateInput } from "../_types";

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
                // Next の環境/タイミングによって set が効かないケースがあるので握りつぶす
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

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  // NOTE:
  // - cash_flows.user_id は DB 側 default(auth.uid()) 前提（クライアントからは送らない）
  // - source_type は NOT NULL 想定なので manual をデフォルトにする
  // - section は 'in' | 'out' 制約想定
  const payload = {
    cash_account_id: input.cashAccountId,
    date: input.date,
    section: input.section,
    amount: input.amount,
    cash_category_id: input.cashCategoryId ?? null,
    description: input.description ?? null,
    source_type: input.sourceType ?? "manual",
  };

  const { error } = await supabase.from("cash_flows").insert(payload);

  if (error) throw new Error(error.message);

  return { ok: true };
}