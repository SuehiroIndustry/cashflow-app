// app/api/summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type BalanceRow = {
  user_id: string;
  account_id: string;
  income: number | null;
  expense: number | null;
  balance: number | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get("account"); // "all" | account_id(uuid) | null

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // VIEW: public.account_balances を参照
  // 期待カラム: user_id, account_id, income, expense, balance
  let q = supabase.from("account_balances").select("user_id,account_id,income,expense,balance").eq("user_id", user.id);

  const isAll = !account || account === "all";
  if (!isAll) {
    q = q.eq("account_id", account);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as BalanceRow[];

  // account=all のときは全口座を合算。特定口座ならその1行（なければ0扱い）
  const income = rows.reduce((s, r) => s + Number(r.income ?? 0), 0);
  const expense = rows.reduce((s, r) => s + Number(r.expense ?? 0), 0);
  const balance = rows.reduce((s, r) => s + Number(r.balance ?? 0), 0);

  return NextResponse.json({
    account: isAll ? "all" : account,
    income,
    expense,
    balance,
  });
}