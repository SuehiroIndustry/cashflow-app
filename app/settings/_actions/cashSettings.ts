"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type {
  CashSettingsRow,
  CashSettingsUpdateInput,
  DerivedInventoryThreshold,
} from "../_types";

/**
 * Supabase Server Client（Next.js App Router / cookies async対応）
 */
async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
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
          // Server Action では set が禁止されるケースがあるため握る
        }
      },
    },
  });
}

/**
 * 最低在庫水位を計算
 */
export function calcMinInventoryUnits(params: {
  avg_shipments_per_month: number;
  lead_time_months: number;
  safety_buffer_weeks: number;
  min_inventory_units_override: number | null;
}): DerivedInventoryThreshold {
  const {
    avg_shipments_per_month,
    lead_time_months,
    safety_buffer_weeks,
    min_inventory_units_override,
  } = params;

  const avgMonth = Math.max(0, Math.floor(avg_shipments_per_month));
  const leadMonths = Math.max(0, Math.floor(lead_time_months));
  const bufferWeeks = Math.max(0, Math.floor(safety_buffer_weeks));

  // 月→週（安全な簡易換算）
  const weekly = Math.ceil(avgMonth / 4);

  const leadtimeUnits = avgMonth * leadMonths;
  const bufferUnits = weekly * bufferWeeks;

  const calculated = Math.max(0, leadtimeUnits + bufferUnits);
  const effective =
    min_inventory_units_override == null
      ? calculated
      : Math.max(0, Math.floor(min_inventory_units_override));

  return {
    min_inventory_units_calculated: calculated,
    min_inventory_units_effective: effective,
  };
}

/**
 * 設定取得（なければ作成）
 */
export async function getCashSettings(): Promise<CashSettingsRow> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("cash_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code === "PGRST116") {
    const { data: inserted, error: insErr } = await supabase
      .from("cash_settings")
      .insert({ user_id: user.id })
      .select("*")
      .single();

    if (insErr || !inserted) {
      throw new Error(insErr?.message ?? "Failed to create cash_settings");
    }
    return inserted as CashSettingsRow;
  }

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load cash_settings");
  }

  return data as CashSettingsRow;
}

/**
 * 設定更新
 */
export async function upsertCashSettings(
  input: CashSettingsUpdateInput
): Promise<CashSettingsRow> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error("Not authenticated");
  }

  const payload = { user_id: user.id, ...input };

  const { data, error } = await supabase
    .from("cash_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update cash_settings");
  }

  return data as CashSettingsRow;
}