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

  // ✅ 型は camelCase で受ける（_types.ts と一致）
  const {
    cashAccountId,
    date,
    section,
    amount,
    cashCategoryId,
    description,
    sourceType = "manual",
  } = input;

  // ✅ DBへ入れる直前で snake_case に変換
  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: cashAccountId,
    date,
    section,
    amount,
    cash_category_id: cashCategoryId, // manual なら必須運用（制約あり）
    description: description ?? null,
    source_type: sourceType,
  });

  if (error) throw new Error(error.message);

  return { success: true };
}