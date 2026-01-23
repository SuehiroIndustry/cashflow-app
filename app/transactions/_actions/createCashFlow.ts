// app/transactions/_actions/createCashFlow.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { CashFlowCreateInput } from "@/app/dashboard/_types";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test((s ?? "").trim());
}

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
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Action 環境では set が失敗することがあるが無視でOK
          }
        },
      },
    }
  );
}

export async function createCashFlow(input: CashFlowCreateInput): Promise<void> {
  const supabase = await getSupabase();

  const cashAccountId = input.cashAccountId;
  const { date, section, amount } = input;
  const cashCategoryId = input.cashCategoryId ?? null;
  const sourceType = input.sourceType ?? "manual";
  const description = input.description ?? null;

  // validate（最低限）
  if (!Number.isFinite(cashAccountId) || cashAccountId <= 0) {
    throw new Error("cashAccountId が不正です");
  }
  if (!isYmd(date)) {
    throw new Error("date は YYYY-MM-DD 形式で指定してください");
  }
  if (section !== "in" && section !== "out") {
    throw new Error("section は 'in' | 'out' で指定してください");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount が不正です");
  }
  if (sourceType === "manual" && cashCategoryId == null) {
    throw new Error("manual の場合は cashCategoryId が必須です");
  }

  const { error } = await supabase.from("cash_flows").insert({
    cash_account_id: cashAccountId,
    date,
    section,
    amount,
    cash_category_id: cashCategoryId,
    description,
    source_type: sourceType,
  });

  if (error) throw new Error(error.message);
}