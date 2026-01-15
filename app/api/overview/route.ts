// app/api/overview/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type OverviewRow = {
  user_id: string;
  current_balance: number | null;
  monthly_fixed_cost: number | null;
  month_expense: number | null;
  planned_orders_30d: number | null;
  projected_balance: number | null;
  level: "RED" | "YELLOW" | "GREEN" | string;
  computed_at: string;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dashboard_overview")
    .select(
      "user_id,current_balance,monthly_fixed_cost,month_expense,planned_orders_30d,projected_balance,level,computed_at"
    )
    .eq("user_id", user.id)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data?.[0] ?? null) as OverviewRow | null;

  return NextResponse.json({
    current_balance: Number(row?.current_balance ?? 0),
    monthly_fixed_cost: Number(row?.monthly_fixed_cost ?? 0),
    month_expense: Number(row?.month_expense ?? 0),
    planned_orders_30d: Number(row?.planned_orders_30d ?? 0),
    projected_balance: Number(row?.projected_balance ?? 0),
    level: row?.level ?? "GREEN",
    computed_at: row?.computed_at ?? null,
  });
}