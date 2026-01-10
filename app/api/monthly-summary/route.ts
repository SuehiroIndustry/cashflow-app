// app/api/monthly-summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type MonthlyUserRow = {
  user_id: string;
  month: string; // YYYY-MM-01
  income: number | null;
  expense: number | null;
  balance: number | null;
};

type MonthlyAccountRow = {
  user_id: string;
  account_id: string;
  month: string; // YYYY-MM-01
  income: number | null;
  expense: number | null;
  balance: number | null;
};

function normalizeMonthParam(monthParam: string | null) {
  // "YYYY-MM" -> "YYYY-MM-01"
  const m = (monthParam ?? "").trim();
  if (!m) return null;
  if (/^\d{4}-\d{2}$/.test(m)) return `${m}-01`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(m)) return m; // 直接来てもOK
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get("account"); // "all" | uuid
  const monthParam = url.searchParams.get("month"); // "YYYY-MM" 推奨
  const month = normalizeMonthParam(monthParam);

  if (!month) {
    return NextResponse.json({ error: "month is required (YYYY-MM)" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isAll = !account || account === "all";

  if (isAll) {
    const { data, error } = await supabase
      .from("monthly_user_balances")
      .select("user_id,month,income,expense,balance")
      .eq("user_id", user.id)
      .eq("month", month)
      .limit(1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = (data?.[0] ?? null) as MonthlyUserRow | null;

    return NextResponse.json({
      account: "all",
      month,
      income: Number(row?.income ?? 0),
      expense: Number(row?.expense ?? 0),
      balance: Number(row?.balance ?? 0),
    });
  }

  // account 指定（月次口座別VIEW）
  const { data, error } = await supabase
    .from("monthly_account_balances")
    .select("user_id,account_id,month,income,expense,balance")
    .eq("user_id", user.id)
    .eq("account_id", account)
    .eq("month", month)
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = (data?.[0] ?? null) as MonthlyAccountRow | null;

  return NextResponse.json({
    account,
    month,
    income: Number(row?.income ?? 0),
    expense: Number(row?.expense ?? 0),
    balance: Number(row?.balance ?? 0),
  });
}