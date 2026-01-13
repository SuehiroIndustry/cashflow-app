// app/api/summary/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type SummaryRow = {
  type: "income" | "expense";
  amount: number | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const account = url.searchParams.get("account"); // "all" | cash_account_id(number) | null

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const isAll = !account || account === "all";
  const accountId = isAll ? null : Number(account);

  // cash_flows を集計して income/expense/balance を返す
  // ※RLSが効く前提 + 念のため user_id で絞る
  let q = supabase
    .from("cash_flows")
    .select("type,amount")
    .eq("user_id", user.id);

  if (accountId) {
    q = q.eq("cash_account_id", accountId);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json(
      { error: error.message, hint: "Failed to query cash_flows" },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as SummaryRow[];

  const income = rows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const expense = rows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + Number(r.amount ?? 0), 0);

  const balance = income - expense;

  return NextResponse.json({
    account: isAll ? "all" : String(accountId),
    income,
    expense,
    balance,
  });
}