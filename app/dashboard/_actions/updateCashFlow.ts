// app/dashboard/_actions/updateCashFlow.ts
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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

export async function updateCashFlow(input: CashFlowUpdateInput) {
  const supabase = await getSupabase();

  // ✅ update payload を安全に組み立てる
  const payload: Record<string, any> = {};

  if (input.date !== undefined) payload.date = input.date;
  if (input.section !== undefined) payload.section = input.section;
  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.cashCategoryId !== undefined)
    payload.cash_category_id = input.cashCategoryId;
  if (input.description !== undefined)
    payload.description = input.description ?? null;

  if (Object.keys(payload).length === 0) {
    throw new Error("No fields to update.");
  }

  const { error } = await supabase
    .from("cash_flows")
    .update(payload)
    .eq("id", input.id)
    .eq("cash_account_id", input.cashAccountId);

  if (error) {
    throw new Error(error.message);
  }

  return { success: true };
}