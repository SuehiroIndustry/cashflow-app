// app/simulation/_actions/scenarios.ts
"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export type SimulationScenarioRow = {
  id: number;
  user_id: string;
  name: string;
  assumed_income: number;
  assumed_expense: number;
  horizon_months: number;
  created_at: string;
  updated_at: string;
};

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
            // Server Component / Route Handler context differences
          }
        },
      },
    }
  );
}

export async function listSimulationScenarios(): Promise<SimulationScenarioRow[]> {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!user) return [];

  const { data, error } = await supabase
    .from("simulation_scenarios")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SimulationScenarioRow[];
}

export async function createSimulationScenario(input: {
  name: string;
  assumedIncome: number;
  assumedExpense: number;
  horizonMonths?: number;
}): Promise<SimulationScenarioRow> {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const name = (input.name ?? "").trim();
  if (!name) throw new Error("シナリオ名が空です");

  const assumed_income = Math.max(0, Math.floor(Number(input.assumedIncome ?? 0)));
  const assumed_expense = Math.max(0, Math.floor(Number(input.assumedExpense ?? 0)));
  const horizon_months = Math.max(1, Math.floor(Number(input.horizonMonths ?? 12)));

  const { data, error } = await supabase
    .from("simulation_scenarios")
    .insert({
      user_id: user.id,
      name,
      assumed_income,
      assumed_expense,
      horizon_months,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SimulationScenarioRow;
}

export async function deleteSimulationScenario(id: number): Promise<void> {
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("simulation_scenarios")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}