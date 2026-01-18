// app/dashboard/_actions/getCashFlows.ts
"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { CashFlowListRow } from "../_types";

/**
 * 指定した月（"YYYY-MM-01"）に属する cash_flows を返す
 * - cash_categories を join して返す
 */
export async function getCashFlows(args: {
  cash_account_id: number;
  month: string; // "YYYY-MM-01"
}): Promise<CashFlowListRow[]> {
  const supabase = await createSupabaseServerClient();

  // auth（RLS 前提）
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  // 月の範囲を作る
  const start = args.month; // "YYYY-MM-01"
  const d = new Date(`${args.month}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid month format");
  d.setUTCMonth(d.getUTCMonth() + 1);
  const end = d.toISOString().slice(0, 10); // "YYYY-MM-DD"（次月1日）

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
      cash_categories (
        id,
        name
      )
    `
    )
    .eq("cash_account_id", args.cash_account_id)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  // Supabase の join はプロパティ名がテーブル名になる（cash_categories）
  return (data ?? []).map((r: any) => ({
    id: Number(r.id),
    cash_account_id: Number(r.cash_account_id),
    date: String(r.date),
    section: r.section === "out" ? "out" : "in",
    amount: Number(r.amount ?? 0),
    cash_category_id: r.cash_category_id == null ? null : Number(r.cash_category_id),
    description: r.description ?? null,
    created_at: r.created_at ?? null,
    cash_category: r.cash_categories
      ? { id: Number(r.cash_categories.id), name: String(r.cash_categories.name) }
      : null,
  }));
}