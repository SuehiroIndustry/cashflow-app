// app/api/dashboard-summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type SummaryRow = {
  user_id: string;
  accounts_count: number | null;
  red_count: number | null;
  yellow_count: number | null;
  stale_count: number | null;
  min_balance: number | null;
  total_balance: number | null;
  last_computed_at: string | null;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // VIEW: public.v_dashboard_summary_v2
  const { data, error } = await supabase
    .from("v_dashboard_summary_v2")
    .select(
      "user_id,accounts_count,red_count,yellow_count,stale_count,min_balance,total_balance,last_computed_at"
    )
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data?.[0] ?? null) as SummaryRow | null;

  return NextResponse.json({
    accounts_count: Number(row?.accounts_count ?? 0),
    red_count: Number(row?.red_count ?? 0),
    yellow_count: Number(row?.yellow_count ?? 0),
    stale_count: Number(row?.stale_count ?? 0),
    min_balance: Number(row?.min_balance ?? 0),
    total_balance: Number(row?.total_balance ?? 0),
    last_computed_at: row?.last_computed_at ?? null,
  });
}