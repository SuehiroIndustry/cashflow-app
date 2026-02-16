// app/api/monthly-summary/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const account = searchParams.get("account"); // "all" or number
  const month = searchParams.get("month"); // "YYYY-MM-01"

  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const isAll = !account || account === "all";
  const accountId = isAll ? null : Number(account);

  if (!isAll && (!Number.isFinite(accountId!) || accountId! <= 0)) {
    return NextResponse.json({ error: "account is invalid" }, { status: 400 });
  }

  // ✅ 全口座の場合、まず所属orgの口座ID一覧を取る（RLS前提）
  let targetAccountIds: number[] = [];

  if (isAll) {
    const { data: member, error: memErr } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .order("org_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

    const orgId = (member as any)?.org_id ?? null;
    if (orgId == null) {
      return NextResponse.json({ income: 0, expense: 0, balance: 0, month }, { status: 200 });
    }

    const { data: accs, error: accErr } = await supabase
      .from("cash_accounts")
      .select("id")
      .eq("org_id", orgId)
      .order("id", { ascending: true });

    if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 });

    targetAccountIds = (accs ?? []).map((r: any) => Number(r.id)).filter((n) => Number.isFinite(n));
  } else {
    targetAccountIds = [accountId!];
  }

  if (!targetAccountIds.length) {
    return NextResponse.json({ income: 0, expense: 0, balance: 0, month }, { status: 200 });
  }

  // ✅ user_idで絞らない（月次は口座単位で共有）
  const { data, error } = await supabase
    .from("monthly_cash_account_balances")
    .select("income, expense, balance")
    .in("cash_account_id", targetAccountIds)
    .eq("month", month);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const income = (data ?? []).reduce((s: number, r: any) => s + toNumber(r.income, 0), 0);
  const expense = (data ?? []).reduce((s: number, r: any) => s + toNumber(r.expense, 0), 0);
  const balance = (data ?? []).reduce((s: number, r: any) => s + toNumber(r.balance, 0), 0);

  return NextResponse.json({
    account: isAll ? "all" : String(accountId),
    month,
    income,
    expense,
    balance,
  });
}