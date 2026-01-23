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

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = await getSupabase();

  // ✅ camel/snake どっちで来ても受ける（互換運用）
  const cash_account_id = input.cash_account_id ?? input.cashAccountId;
  const cash_category_id = input.cash_category_id ?? input.cashCategoryId ?? null;
  const source_type = input.source_type ?? input.sourceType ?? "manual";

  const { date, section, amount, description } = input;

  // validate（最低限）
  if (typeof cash_account_id !== "number" || !Number.isFinite(cash_account_id) || cash_account_id <= 0) {
    throw new Error("cash_account_id が不正です");
  }
  if (!isYmd(date)) {
    throw new Error("date は 'YYYY-MM-DD' 形式で指定してください");
  }
  if (section !== "in" && section !== "out") {
    throw new Error("section は 'in' | 'out' のみです");
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount が不正です");
  }

  // ✅ DBに入れる形は snake_case
  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id,
    date,
    section,
    amount,
    cash_category_id,
    description: description ?? null,
    source_type,
  });

  if (error) throw new Error(error.message);

  return { success: true };
}