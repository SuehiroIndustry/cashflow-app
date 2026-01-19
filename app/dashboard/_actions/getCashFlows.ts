// app/dashboard/_actions/getCashFlows.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowListRow } from "../_types";

function normalizeMonthKey(input: string): string {
  // Accept: "YYYY-MM" or "YYYY-MM-01"
  if (/^\d{4}-\d{2}$/.test(input)) return `${input}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input.slice(0, 7) + "-01";
  throw new Error("Invalid month format");
}

function nextMonthStart(monthStartYYYYMM01: string): string {
  const d = new Date(`${monthStartYYYYMM01}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid month format");
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function getCashFlows(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM" or "YYYY-MM-01"
}): Promise<CashFlowListRow[]> {
  const supabase = await createSupabaseServerClient();

  // auth（RLS 前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const monthStart = normalizeMonthKey(args.month); // "YYYY-MM-01"
  const monthEnd = nextMonthStart(monthStart); // 次月の "YYYY-MM-01"

  const { data, error } = await supabase
    .from("cash_flows")
    .select(
      `
      id,
      cash_account_id,
      date,
      section,
      amount,
      cash_category_id,
      description,
      created_at,
      cash_category:cash_categories (
        id,
        name
      )
    `
    )
    .eq("cash_account_id", args.cash_account_id)
    .gte("date", monthStart)
    .lt("date", monthEnd)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .returns<CashFlowListRow[]>();

  if (error) throw error;

  // supabase の data は null の可能性がある
  return data ?? [];
}