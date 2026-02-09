// app/dashboard/fixed-costs/_actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FixedCostItem = {
  id: number;
  name: string;
  monthly_amount: number;
  enabled: boolean;
  sort_order: number;
};

function toNumber(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function listFixedCosts(): Promise<FixedCostItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("fixed_cost_items")
    .select("id, name, monthly_amount, enabled, sort_order")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.error("[listFixedCosts] error:", error);
    return [];
  }

  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: String(r.name ?? ""),
    monthly_amount: toNumber(r.monthly_amount),
    enabled: !!r.enabled,
    sort_order: toNumber(r.sort_order),
  }));
}

export async function upsertFixedCost(input: {
  id?: number;
  name: string;
  monthly_amount: number;
  enabled: boolean;
  sort_order: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();

  const payload: any = {
    name: input.name,
    monthly_amount: input.monthly_amount,
    enabled: input.enabled,
    sort_order: input.sort_order,
  };
  if (typeof input.id === "number") payload.id = input.id;

  const { error } = await supabase.from("fixed_cost_items").upsert(payload);

  if (error) {
    console.error("[upsertFixedCost] error:", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/fixed-costs");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteFixedCost(id: number): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("fixed_cost_items").delete().eq("id", id);

  if (error) {
    console.error("[deleteFixedCost] error:", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/fixed-costs");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function bulkSaveFixedCosts(items: FixedCostItem[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();

  const payload = items.map((it, idx) => ({
    id: it.id,
    name: it.name,
    monthly_amount: it.monthly_amount,
    enabled: it.enabled,
    sort_order: idx, // 保存時に並びを確定
  }));

  const { error } = await supabase.from("fixed_cost_items").upsert(payload);

  if (error) {
    console.error("[bulkSaveFixedCosts] error:", error);
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard/fixed-costs");
  revalidatePath("/dashboard");
  return { ok: true };
}