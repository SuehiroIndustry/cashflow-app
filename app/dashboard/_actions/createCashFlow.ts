// app/transactions/_actions/createCashFlow.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CashFlowCreateInput } from "@/app/dashboard/_types";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = await getSupabase();

  const {
    cashAccountId,
    date,
    section,
    amount,
    cashCategoryId,
    description,
    sourceType = "manual",
  } = input;

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: cashAccountId,        // ← ここで変換
    date,
    section,
    amount,
    cash_category_id: cashCategoryId,      // ← ここで変換
    description: description ?? null,
    source_type: sourceType,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}