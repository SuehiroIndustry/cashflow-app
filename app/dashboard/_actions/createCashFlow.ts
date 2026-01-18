// app/dashboard/_actions/createCashFlow.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashFlowCreateInput } from "../_types";

function toMonthStart(dateYYYYMMDD: string) {
  return `${dateYYYYMMDD.slice(0, 7)}-01`; // "YYYY-MM-01"
}

function nextMonthStart(monthStartYYYYMM01: string) {
  const d = new Date(`${monthStartYYYYMM01}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10); // "YYYY-MM-01"
}

export async function createCashFlow(input: CashFlowCreateInput) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) throw new Error("Not authenticated");

  // 1) insert cash_flows
  const { error: insErr } = await supabase.from("cash_flows").insert({
    user_id: user.id,
    cash_account_id: input.cash_account_id,
    date: input.date,
    section: input.section, // 'in' | 'out'
    type: input.section, // まずは section と同義でOK（後で拡張できる）
    amount: input.amount,
    currency: "JPY",
    source_type: "manual",
    source_id: null,
    is_projection: false,
    cash_category_id: input.cash_category_id, // manual なので必須
    description: input.description ?? null,
  });

  if (insErr) throw insErr;

  // 2) 再集計して monthly_cash_account_balances を upsert（上書きでOKになる）
  const monthStart = toMonthStart(input.date);
  const monthEnd = nextMonthStart(monthStart);

  const { data: rows, error: sumErr } = await supabase
    .from("cash_flows")
    .select("section, amount")
    .eq("user_id", user.id)
    .eq("cash_account_id", input.cash_account_id)
    .gte("date", monthStart)
    .lt("date", monthEnd);

  if (sumErr) throw sumErr;

  const income = (rows ?? [])
    .filter((r) => r.section === "in")
    .reduce((a, r: any) => a + Number(r.amount ?? 0), 0);

  const expense = (rows ?? [])
    .filter((r) => r.section === "out")
    .reduce((a, r: any) => a + Number(r.amount ?? 0), 0);

  const balance = income - expense;

  const { error: upErr } = await supabase
    .from("monthly_cash_account_balances")
    .upsert(
      {
        user_id: user.id,
        cash_account_id: input.cash_account_id,
        month: monthStart,
        income,
        expense,
        balance,
      },
      { onConflict: "user_id,cash_account_id,month" }
    );

  if (upErr) throw upErr;

  return { ok: true };
}