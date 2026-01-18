// app/dashboard/_actions/getCashFlows.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import type { CashFlowListRow } from "../_types";

export async function getCashFlows(args: {
  cash_account_id: number;
  month: string; // YYYY-MM
}): Promise<CashFlowListRow[]> {
  // ★createClient が Promise の実装なら await
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const start = `${args.month}-01`;
  const d = new Date(`${args.month}-01T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid month format");
  d.setUTCMonth(d.getUTCMonth() + 1);
  const end = d.toISOString().slice(0, 10);

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
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;

  return (data ?? []) as unknown as CashFlowListRow[];
}